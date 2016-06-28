// Load modules

var Crypto = require('crypto');
var Boom = require('boom');
var Hoek = require('hoek');
var Cryptiles = require('cryptiles');


// Declare internals

var internals = {};


// Common defaults

exports.defaults = {
    encryption: {
        saltBits: 256,
        algorithm: 'aes-256-cbc',
        iterations: 1
    },

    integrity: {
        saltBits: 256,
        algorithm: 'sha256',
        iterations: 1
    },

    ttl: 0,                                             // Milliseconds, 0 means forever
    timestampSkewSec: 60,                               // Seconds of permitted clock skew for incoming expirations
    localtimeOffsetMsec: 0                              // Local clock time offset express in a number of milliseconds (positive or negative)
};


// Algorithm configuration

exports.algorithms = {

    'aes-128-ctr': { keyBits: 128, ivBits: 128 },       // Requires node 0.10.x
    'aes-256-cbc': { keyBits: 256, ivBits: 128 },
    'sha256': { keyBits: 256 }
};


// MAC normalization format version

exports.macFormatVersion = '2';                         // Prevent comparison of mac values generated with different normalized string formats
exports.macPrefix = 'Fe26.' + exports.macFormatVersion;


// Generate a unique encryption key

/*
    var options =  {
        saltBits: 256,                                  // Ignored if salt is set
        salt: '4d8nr9q384nr9q384nr93q8nruq9348run',
        algorithm: 'aes-128-ctr',
        iterations: 10000,
        iv: 'sdfsdfsdfsdfscdrgercgesrcgsercg'           // Optional
    };
*/

exports.generateKey = function (password, options, callback) {

    var callbackTick = Hoek.nextTick(callback);

    if (!password) {
        return callbackTick(Boom.internal('Empty password'));
    }

    if (!options ||
        typeof options !== 'object') {

        return callbackTick(Boom.internal('Bad options'));
    }

    var algorithm = exports.algorithms[options.algorithm];
    if (!algorithm) {
        return callbackTick(Boom.internal('Unknown algorithm: ' + options.algorithm));
    }

    var generate = function () {

        if (Buffer.isBuffer(password)) {
            if (password.length < algorithm.keyBits / 8) {
                return callbackTick(Boom.internal('Key buffer (password) too small'));
            }

            var result = {
                key: password,
                salt: ''
            };

            return generateIv(result);
        }

        if (options.salt) {
            return generateKey(options.salt);
        }

        if (options.saltBits) {
            return generateSalt();
        }

        return callbackTick(Boom.internal('Missing salt or saltBits options'));
    };

    var generateSalt = function () {

        var randomSalt = Cryptiles.randomBits(options.saltBits);
        if (randomSalt instanceof Error) {
            return callbackTick(randomSalt);
        }

        var salt = randomSalt.toString('hex');
        return generateKey(salt);
    };

    var generateKey = function (salt) {

        Crypto.pbkdf2(password, salt, options.iterations, algorithm.keyBits / 8, function (err, derivedKey) {

            if (err) {
                return callback(err);
            }

            var result = {
                key: derivedKey,
                salt: salt
            };

            return generateIv(result);
        });
    };

    var generateIv = function (result) {

        if (algorithm.ivBits &&
            !options.iv) {

            var randomIv = Cryptiles.randomBits(algorithm.ivBits);
            if (randomIv instanceof Error) {
                return callbackTick(randomIv);
            }

            result.iv = randomIv;
            return callbackTick(null, result);
        }
        else {
            if (options.iv) {
                result.iv = options.iv;
            }

            return callbackTick(null, result);
        }
    };

    generate();
};


// Encrypt data
// options: see exports.generateKey()

exports.encrypt = function (password, options, data, callback) {

    exports.generateKey(password, options, function (err, key) {

        if (err) {
            return callback(err);
        }

        var cipher = Crypto.createCipheriv(options.algorithm, key.key, key.iv);
        var enc = Buffer.concat([cipher.update(data, 'utf8'), cipher.final()]);

        callback(null, enc, key);
    });
};


// Decrypt data
// options: see exports.generateKey()

exports.decrypt = function (password, options, data, callback) {

    exports.generateKey(password, options, function (err, key) {

        if (err) {
            return callback(err);
        }

        var decipher = Crypto.createDecipheriv(options.algorithm, key.key, key.iv);
        var dec = decipher.update(data, null, 'utf8');
        dec += decipher.final('utf8');

        callback(null, dec);
    });
};


// HMAC using a password
// options: see exports.generateKey()

exports.hmacWithPassword = function (password, options, data, callback) {

    exports.generateKey(password, options, function (err, key) {

        if (err) {
            return callback(err);
        }

        var hmac = Crypto.createHmac(options.algorithm, key.key).update(data);
        var digest = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');

        var result = {
            digest: digest,
            salt: key.salt
        };

        return callback(null, result);
    });
};


// Normalizes a password parameter into a { id, encryption, integrity } object
// password: string, buffer or object with { id, secret } or { id, encryption, integrity }

internals.normalizePassword = function (password) {

    var obj = {};

    if (password instanceof Object &&
        !Buffer.isBuffer(password)) {

        obj.id = password.id;
        obj.encryption = password.secret || password.encryption;
        obj.integrity = password.secret || password.integrity;
    }
    else {
        obj.encryption = password;
        obj.integrity = password;
    }

    return obj;
};


// Encrypt and HMAC an object
// password: string, buffer or object with { id, secret } or { id, encryption, integrity }
// options: see exports.defaults

exports.seal = function (object, password, options, callback) {

    var now = Date.now() + (options.localtimeOffsetMsec || 0);                 // Measure now before any other processing

    var callbackTick = Hoek.nextTick(callback);

    // Serialize object

    var objectString = JSON.stringify(object);

    // Obtain password

    var passwordId = '';
    password = internals.normalizePassword(password);
    if (password.id) {
        if (!/^\w+$/.test(password.id)) {
            return callbackTick(Boom.internal('Invalid password id'));
        }

        passwordId = password.id;
    }

    // Encrypt object string

    exports.encrypt(password.encryption, options.encryption, objectString, function (err, encrypted, key) {

        if (err) {
            return callback(err);
        }

        // Base64url the encrypted value

        var encryptedB64 = Hoek.base64urlEncode(encrypted);
        var iv = Hoek.base64urlEncode(key.iv);
        var expiration = (options.ttl ? now + options.ttl : '');
        var macBaseString = exports.macPrefix + '*' + passwordId + '*' + key.salt + '*' + iv + '*' + encryptedB64 + '*' + expiration;

        // Mac the combined values

        var hmac = exports.hmacWithPassword(password.integrity, options.integrity, macBaseString, function (err, mac) {

            if (err) {
                return callback(err);
            }

            // Put it all together

            // prefix*[password-id]*encryption-salt*encryption-iv*encrypted*[expiration]*hmac-salt*hmac
            // Allowed URI query name/value characters: *-. \d \w

            var sealed = macBaseString + '*' + mac.salt + '*' + mac.digest;
            return callback(null, sealed);
        });
    });
};


// Decrypt and validate sealed string
// password: string, buffer or object with { id: secret } or { id: { encryption, integrity } }
// options: see exports.defaults

exports.unseal = function (sealed, password, options, callback) {

    var now = Date.now() + (options.localtimeOffsetMsec || 0);                 // Measure now before any other processing

    var callbackTick = Hoek.nextTick(callback);

    // Break string into components

    var parts = sealed.split('*');
    if (parts.length !== 8) {
        return callbackTick(Boom.internal('Incorrect number of sealed components'));
    }

    var macPrefix = parts[0];
    var passwordId = parts[1];
    var encryptionSalt = parts[2];
    var encryptionIv = parts[3];
    var encryptedB64 = parts[4];
    var expiration = parts[5];
    var hmacSalt = parts[6];
    var hmac = parts[7];
    var macBaseString = macPrefix + '*' + passwordId + '*' + encryptionSalt + '*' + encryptionIv + '*' + encryptedB64 + '*' + expiration;

    // Check prefix

    if (macPrefix !== exports.macPrefix) {
        return callbackTick(Boom.internal('Wrong mac prefix'));
    }

    // Check expiration

    if (expiration) {
        if (!expiration.match(/^\d+$/)) {
            return callbackTick(Boom.internal('Invalid expiration'));
        }

        var exp = parseInt(expiration, 10);
        if (exp <= (now - (options.timestampSkewSec * 1000))) {
            return callbackTick(Boom.internal('Expired seal'));
        }
    }

    // Obtain password

    if (password instanceof Object &&
        !(Buffer.isBuffer(password))) {

        password = password[passwordId || 'default'];
        if (!password) {
            return callbackTick(Boom.internal('Cannot find password: ' + passwordId));
        }
    }
    password = internals.normalizePassword(password);

    // Check hmac

    var macOptions = Hoek.clone(options.integrity);
    macOptions.salt = hmacSalt;
    exports.hmacWithPassword(password.integrity, macOptions, macBaseString, function (err, mac) {

        if (err) {
            return callback(err);
        }

        if (!Cryptiles.fixedTimeComparison(mac.digest, hmac)) {
            return callback(Boom.internal('Bad hmac value'));
        }

        // Decrypt

        var encrypted = Hoek.base64urlDecode(encryptedB64, 'buffer');
        if (encrypted instanceof Error) {
            return callback(encrypted);
        }

        var decryptOptions = Hoek.clone(options.encryption);
        decryptOptions.salt = encryptionSalt;

        decryptOptions.iv = Hoek.base64urlDecode(encryptionIv, 'buffer');
        if (decryptOptions.iv instanceof Error) {
            return callback(decryptOptions.iv);
        }

        exports.decrypt(password.encryption, decryptOptions, encrypted, function (err, decrypted) {

            // Parse JSON

            var object = null;
            try {
                object = JSON.parse(decrypted);
            }
            catch (err) {
                return callback(Boom.internal('Failed parsing sealed object JSON: ' + err.message));
            }

            return callback(null, object);
        });
    });
};

