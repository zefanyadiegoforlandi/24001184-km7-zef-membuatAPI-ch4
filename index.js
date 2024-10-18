//ZEFANYA DIEGO FORLANDICCO
const express = require('express');
const { PrismaClient } = require('@prisma/client');
const bodyParser = require('body-parser'); // Import body-parser
const app = express();
const prisma = new PrismaClient();

// Middleware untuk menangani JSON
app.use(bodyParser.json()); // Menggunakan body-parser untuk JSON
// Middleware untuk menangani URL-encoded data
app.use(bodyParser.urlencoded({ extended: true })); // Menggunakan body-parser untuk URL-encoded

// API USERS BESERTA PROFILE
// POST /api/v1/users: menambahkan user dan profile
app.post('/api/v1/users', async (req, res) => {
    const { name, email, password, identity_type, identity_number, address } = req.body;

    // Pastikan identity_number adalah string
    const identityNumberString = typeof identity_number === 'number' ? identity_number.toString() : identity_number;
    try {
        // Cek apakah email sudah ada
        const existingEmail = await prisma.user.findUnique({
            where: { email }
        });

        if (existingEmail) {
            return res.status(400).json({
                status: 400,
                error: 'Email sudah terdaftar'
            });
        }

        // Cek apakah identity number sudah ada
        const existingIdentity = await prisma.profile.findUnique({
            where: { identity_number: identityNumberString } // Gunakan identityNumberString
        });

        if (existingIdentity) {
            return res.status(400).json({
                status: 400,
                error: 'Identity number sudah terdaftar'
            });
        }

        // Jika tidak ada yang terdaftar, buat pengguna baru
        const newUser = await prisma.user.create({
            data: {
                name,
                email,
                password,
                profile: {
                    create: {
                        identity_type,
                        identity_number: identityNumberString, // Menyertakan identity_number sebagai string
                        address,
                    }
                }
            },
            include: { profile: true } // Menyertakan profil dalam respons
        });

        // Mengirimkan respons sukses dengan status 200 dan pesan
        res.status(201).json({
            status: 201,
            message: 'User berhasil ditambahkan',
            user: newUser
        });
    } catch (error) {
        console.error('Error adding user:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal membuat user',
            error: error.message
        });
    }
});

// GET /api/v1/users: menampilkan daftar users
app.get('/api/v1/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            // include: { profile: true }
        });

        if (users.length === 0) {
            return res.status(200).json({
                status: 200,
                message: 'Tidak ada user yang ditemukan',
                data: []
            });
        }
        
        res.status(200).json({
            status: 200,
            message: 'Berhasil menampilkan users',
            data: users
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            error: 'Gagal menampilkan users',
            data: []
        });
    }
});

// GET /api/v1/users/:userId: menampilkan detail user dengan profile
app.get('/api/v1/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { profile: true }
        });
        
        if (!user) {
            return res.status(404).json({
                status: 404,
                message: 'User tidak ditemukan',
                data: []
            });
        }

        res.status(200).json({
            status: 201,
            message: 'Berhasil menampilkan detail user',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            status: 500,
            error: 'Gagal menampilkan detail user',
            data: []
        });
    }
});

// PUT /api/v1/users/:userId: mengupdate tabel user dan profile
app.put('/api/v1/users/:userId', async (req, res) => { 
    const { userId } = req.params;
    const { name, email, password, identity_type, identity_number, address } = req.body;

    // Konversi identity_number menjadi string jika itu adalah integer
    const identityNumberString = typeof identity_number === 'number' ? identity_number.toString() : identity_number;

    try {
        // Ambil data user beserta profile-nya untuk cek apakah profile sudah ada
        const existingUser = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
            include: { profile: true }
        });

        if (!existingUser) {
            return res.status(404).json({
                status: 404,
                message: 'User ID tidak ditemukan'
            });
        }

        // Cek apakah email sudah dimiliki orang lain, kecuali oleh pengguna itu sendiri
        if (email && email !== existingUser.email) {
            const emailExists = await prisma.user.findUnique({
                where: { email },
            });

            if (emailExists) {
                return res.status(400).json({
                    status: 400,
                    message: 'Email telah dipakai user lain'
                });
            }
        }

        // Cek apakah identity number sudah dimiliki orang lain, kecuali oleh pengguna itu sendiri
        if (identityNumberString && identityNumberString !== existingUser.profile.identity_number) {
            const identityExists = await prisma.profile.findUnique({
                where: { identity_number: identityNumberString }, // Gunakan identityNumberString
            });

            if (identityExists && identityExists.userId !== existingUser.id) {
                return res.status(400).json({
                    status: 400,
                    message: 'Identity number telah dipakai user lain'
                });
            }
        }

        // Siapkan data update untuk user menggunakan Spread Operator 
        const updateData = {
            ...(name && { name }),
            ...(email && { email }),
            ...(password && { password }),
            ...(identity_type || identityNumberString || address ? {
                profile: {
                    update: {
                        ...(identity_type && { identity_type }),
                        ...(identityNumberString && { identity_number: identityNumberString }), // Gunakan identityNumberString
                        ...(address && { address })
                    }
                }
            } : {})
        };

        // Update user (dan profile jika ada data profile yang di-update)
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(userId) },
            data: updateData,
            include: { profile: true }
        });

        res.status(200).json({
            status: 200,
            message: 'User berhasil diupdate',
            data: updatedUser
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal memperbaharui user',
            error: error.message
        });
    }
});

// DELETE /api/v1/users/:userId: menghapus pengguna
app.delete('/api/v1/users/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Cek apakah userId tersedia
        const user = await prisma.user.findUnique({
            where: { id: parseInt(userId) },
        });

        if (!user) {
            return res.status(404).json({
                status: 404,
                message: 'User ID tidak ditemukan',
            });
        }

        // Jika userId ada, lakukan penghapusan
        await prisma.user.delete({
            where: { id: parseInt(userId) }
        });

        res.status(200).json({
            status: 200,
            message: 'User berhasil dihapus'
        });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal menghapus user',
            error: error.message
        });
    }
});



// API ACCOUNTS
// POST /api/v1/accounts: menambahkan akun baru ke user
app.post('/api/v1/accounts', async (req, res) => {
    const { user_id, bank_name, bank_account_number, balance } = req.body;

    // Mengubah bank_account_number menjadi string
    const bankAccountNumberString = typeof bank_account_number === 'number' ? bank_account_number.toString() : bank_account_number;

    try {
        // Cek apakah user_id ada di database
        const userExists = await prisma.user.findUnique({
            where: { id: parseInt(user_id) } // Menggunakan parseInt untuk memastikan id adalah integer
        });

        // Jika user_id tidak ditemukan
        if (!userExists) {
            return res.status(404).json({
                status: 404,
                message: 'User tidak ditemukan',
                data: [],

            });
        }

        // Cek apakah sudah ada bank dengan bank_name dan bank_account_number yang sama
        const existingAccount = await prisma.bankAccount.findFirst({
            where: {
                AND: [
                    { bank_name: bank_name },
                    { bank_account_number: bankAccountNumberString }
                ]
            }
        });

        // Jika kombinasi bank_name dan bank_account_number sudah ada
        if (existingAccount) {
            return res.status(400).json({
                status: 400,
                message: 'Nomor bank ini sudah dipakai untuk bank yang sama'
            });
        }

        // Buat akun baru dengan balance diubah ke integer
        const account = await prisma.bankAccount.create({
            data: {
                balance: parseInt(balance), // Ubah balance menjadi integer
                bank_name,
                bank_account_number: bankAccountNumberString,
                user: { connect: { id: parseInt(user_id) } }
            }
        });

        res.status(201).json({
            status: 201,
            message: 'Akun berhasil ditambahkan',
            data: {
                id: account.id, // Tambahkan id yang dihasilkan oleh database
                user_id: account.user_id,
                bank_name: account.bank_name,
                bank_account_number: account.bank_account_number,
                balance: account.balance
            }
        });
    } catch (error) {
        console.error(error); // Mencetak error untuk debugging
        res.status(500).json({
            status: 500,
            message: 'Gagal menambahkan akun',
            error: error.message
        });
    }
});

// GET /api/v1/accounts: menampilkan daftar akun
app.get('/api/v1/accounts', async (req, res) => {
    try {
        const accounts = await prisma.bankAccount.findMany();
        if (accounts.length === 0) {
            return res.status(200).json({
                status: 200,
                message: 'Tidak ada akun yang ditemukan',
                data: [],
            });
        }
        res.status(200).json({
            status: 200,
            message: 'Berhasil menampilkan daftar akun',
            data: accounts
        });
    } catch (error) {
        res.status(500).json({
            
            status: 500,
            message: 'Gagal menampilkan daftar akun',
            error: error.message
        });
    }
});

// GET /api/v1/accounts/:accountId: menampilkan detail akun
app.get('/api/v1/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;

    try {
        const account = await prisma.bankAccount.findUnique({
            where: { id: parseInt(accountId) },
            include: { user: true } // Menyertakan informasi pengguna
        });

        if (!account) {
            return res.status(404).json({
                status: 404,
                message: 'Akun tidak ditemukan',
                data: [],
            });
        }

        res.status(200).json({
            status: 200,
            message: 'Berhasil menampilkan detail akun',
            data: {
                account, // Kembalikan data akun
            }
        });
    } catch (error) {
        console.error(error); // Untuk membantu debugging jika terjadi kesalahan
        res.status(500).json({
            status: 500,
            message: 'Gagal menampilkan detail akun',
            error: error.message
        });
    }
});

// PUT /api/v1/accounts/:accountId: mengupdate akun
app.put('/api/v1/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;
    const { user_id, bank_name, bank_account_number, balance } = req.body;

    try {
        // Periksa apakah accountId tersedia
        const account = await prisma.bankAccount.findUnique({
            where: { id: parseInt(accountId) },
        });

        if (!account) {
            return res.status(404).json({
                status: 404,
                message: 'Account ID tidak tersedia',
                data: [],

            });
        }

        // Jika user_id disertakan dalam body
        if (user_id !== undefined) {
            // Cek apakah user_id baru ada di database
            const userExists = await prisma.user.findUnique({
                where: { id: user_id },
            });

            if (!userExists) {
                return res.status(404).json({
                    status: 404,
                    message: 'User ID tidak ada',
                });
            }

            // Jika user_id yang baru sama dengan yang lama, jangan update
            if (account.user_id === user_id) {
                delete updateData.user_id; // Hapus user_id dari updateData
            }
        }

        // Buat object updateData hanya dengan field yang ada di req.body menggunakan Spread Operator 
        const updateData = {
            ...(user_id && { user_id }),
            ...(bank_name && { bank_name }),
            ...(bank_account_number && { bank_account_number }),
            ...(balance && { balance })
        };

        // Lakukan update dengan data yang tersedia di updateData
        const updatedAccount = await prisma.bankAccount.update({
            where: { id: parseInt(accountId) },
            data: updateData
        });

        res.status(200).json({
            status: 200,
            message: 'Akun berhasil diupdate',
            data: updatedAccount
        });
    } catch (error) {
        console.error('Error updating account:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal mengupdate akun',
            error: error.message
        });
    }
});

// DELETE /api/v1/accounts/:accountId: menghapus akun
app.delete('/api/v1/accounts/:accountId', async (req, res) => {
    const { accountId } = req.params;

    try {
        // Cek apakah accountId tersedia
        const account = await prisma.bankAccount.findUnique({
            where: { id: parseInt(accountId) },
        });

        if (!account) {
            return res.status(404).json({
                status: 404,
                message: 'Account ID tidak tersedia',
            });
        }

        // Jika accountId ada, lakukan penghapusan
        await prisma.bankAccount.delete({
            where: { id: parseInt(accountId) }
        });

        res.status(200).json({
            status: 200,
            message: 'Akun berhasil dihapus'
        });
    } catch (error) {
        console.error('Error deleting account:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal menghapus akun',
            error: error.message
        });
    }
});


// API TRANSAKSI
// POST api/v1/transactions MEMBUAT TRANSAKSI BARU
app.post('/api/v1/transactions', async (req, res) => {
    // Konversi ke integer jika nilai tidak null
    const sourceAccountIdInt = parseInt(req.body.source_account_id, 10);
    const destinationAccountIdInt = parseInt(req.body.destination_account_id, 10);
    const amountInt = parseInt(req.body.amount, 10);
  
    if (sourceAccountIdInt === destinationAccountIdInt) {
        return res.status(400).json({ message: 'Source and destination accounts must be different.' });
    }
  
    try {
        const sourceAccount = await prisma.bankAccount.findUnique({
            where: { id: sourceAccountIdInt },
        });
        const destinationAccount = await prisma.bankAccount.findUnique({
            where: { id: destinationAccountIdInt },
        });
  
        if (!sourceAccount || !destinationAccount) {
            return res.status(404).json({ message: 'Account not found.' });
        }
  
        if (sourceAccount.balance < amountInt) {
            return res.status(400).json({ message: 'Insufficient balance.' });
        }
  
        // tranfer balances (saldo)
        await prisma.bankAccount.update({
            where: { id: sourceAccountIdInt },
            data: { balance: sourceAccount.balance - amountInt },
        });
  
        await prisma.bankAccount.update({
            where: { id: destinationAccountIdInt },
            data: { balance: destinationAccount.balance + amountInt },
        });
  
        // Record the transaction
        const transaction = await prisma.transaction.create({
            data: {
                source_account_id: sourceAccountIdInt,
                destination_account_id: destinationAccountIdInt,
                amount: amountInt,
            },
        });
  
        res.status(201).json({
            status: 201,
            message: 'Transaksi berhasil',
            transaction,
        });
    } catch (error) {
        res.status(500).json({ 
            status: 500,
            message: 'Error processing transaction', 
            error: error.message
        });
    }
});

// GET /api/v1/transactions: menampilkan semua data transaksi
app.get('/api/v1/transactions', async (req, res) => {
    try {
        const transactions = await prisma.transaction.findMany();

        // Cek apakah ada transaksi
        if (transactions.length === 0) {
            return res.status(404).json({
                status: 404,
                message: 'Transaksi tidak ditemukan',
                data: [],

            });
        }

        // Jika ada transaksi, kirimkan data dengan pesan sukses
        res.status(200).json({
            status: 200,
            message: 'Berhasil menampilkan semua transaksi',
            data: transactions,
        });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal mengambil data transaksi',
            error: error.message
        });
    }
});

 // GET /api/v1/transactions/:id menampilkan detail transaksi yang beserta akun dan usernya
app.get('/api/v1/transactions/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const transaction = await prisma.transaction.findUnique({
            where: { id: parseInt(id) }, // Pastikan id adalah integer
            include: {
                sourceAccount: { // Menggunakan nama relasi yang benar
                    include: {
                        user: true, // Mengambil informasi pengguna dari akun sumber
                    },
                },
                destinationAccount: { // Menggunakan nama relasi yang benar
                    include: {
                        user: true, // Mengambil informasi pengguna dari akun tujuan
                    },
                },
            },
        });

        // Cek jika transaksi tidak ditemukan
        if (!transaction) {
            return res.status(404).json({ 
                status: 404,
                message: 'Transaksi tidak ditemukan',
                data: [],
            });
        }

        // Mengembalikan respon dengan format yang sesuai
        res.json({
            status: 200,
            message: "Berhasil menampilkan detail transaksi",
            data: {
                id: transaction.id,
                amount: transaction.amount,
                source_account: {
                    id: transaction.sourceAccount.id,
                    bank_name: transaction.sourceAccount.bank_name, 
                    bank_account_number: transaction.sourceAccount.bank_account_number, 
                    user: {
                        id: transaction.sourceAccount.user.id,
                        name: transaction.sourceAccount.user.name,
                        email: transaction.sourceAccount.user.email,
                    },
                },
                destination_account: {
                    id: transaction.destinationAccount.id,
                    bank_name: transaction.destinationAccount.bank_name, 
                    bank_account_number: transaction.destinationAccount.bank_account_number, 
                    user: {
                        id: transaction.destinationAccount.user.id,
                        name: transaction.destinationAccount.user.name,
                        email: transaction.destinationAccount.user.email,
                    },
                },
            },
        });
    } catch (error) {
        console.error('Error fetching transaction details:', error);
        res.status(500).json({
            status: 500,
            message: 'Gagal mengambil detail data transaksi',
            error: error.message
        });
    }
});
  
// Jalankan server di port 3000
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});
//ZEFANYA DIEGO FORLANDICCO