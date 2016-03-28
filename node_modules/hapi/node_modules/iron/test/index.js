// Load modules

var Crypto = require('crypto');
var Lab = require('lab');
var Hoek = require('hoek');
var Iron = require('../lib');
var Cryptiles = require('cryptiles');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Lab.expect;


describe('Iron', function () {

    var obj = {
        a: 1,
        b: 2,
        c: [3, 4, 5],
        d: {
            e: 'f'
        }
    };

    var password = 'some_not_random_password';

    it('turns object into a ticket than parses the ticket successfully', function (done) {

        Iron.seal(obj, password, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { 'default': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('unseal and sealed object with expiration', function (done) {

        var options = Hoek.clone(Iron.defaults);
        options.ttl = 200;
        Iron.seal(obj, password, options, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { 'default': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('unseal and sealed object with expiration and time offset', function (done) {

        var options = Hoek.clone(Iron.defaults);
        options.ttl = 200;
        options.localtimeOffsetMsec = -100000;
        Iron.seal(obj, password, options, function (err, sealed) {

            expect(err).to.not.exist;

            var options2 = Hoek.clone(Iron.defaults);
            options2.localtimeOffsetMsec = -100000;
            Iron.unseal(sealed, { 'default': password }, options2, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('turns object into a ticket than parses the ticket successfully (password buffer)', function (done) {

        var key = Cryptiles.randomBits(256);
        Iron.seal(obj, key, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { 'default': key }, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('fails to turns object into a ticket (password buffer too short)', function (done) {

        var key = Cryptiles.randomBits(128);
        Iron.seal(obj, key, Iron.defaults, function (err, sealed) {

            expect(err).to.exist;
            expect(err.message).to.equal('Key buffer (password) too small');
            done();
        });
    });

    it('turns object into a ticket than parses the ticket successfully (password object)', function (done) {

        Iron.seal(obj, { id: '1', secret: password }, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { '1': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });
    });

    it('handles separate password buffers (password object)', function(done) {
      var key = {
        id: '1',
        encryption: Cryptiles.randomBits(256),
        integrity: Cryptiles.randomBits(256)
      };

      Iron.seal(obj, key, Iron.defaults, function (err, sealed) {

          expect(err).to.not.exist;

          Iron.unseal(sealed, { '1': key }, Iron.defaults, function (err, unsealed) {

              expect(err).to.not.exist;
              done();
          });
      });
    });

    it('handles a common password buffer (password object)', function(done) {
      var key = {
        id: '1',
        secret: Cryptiles.randomBits(256)
      };

      Iron.seal(obj, key, Iron.defaults, function (err, sealed) {

          expect(err).to.not.exist;

          Iron.unseal(sealed, { '1': key }, Iron.defaults, function (err, unsealed) {

              expect(err).to.not.exist;
              done();
          });
      });
    });

    it('fails to parse a sealed object when password not found', function (done) {

        Iron.seal(obj, { id: '1', secret: password }, Iron.defaults, function (err, sealed) {

            expect(err).to.not.exist;

            Iron.unseal(sealed, { '2': password }, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Cannot find password: 1');
                done();
            });
        });
    });

    describe('#generateKey', function () {

        it('returns an error when password is missing', function (done) {

            Iron.generateKey(null, null, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when options are missing', function (done) {

            Iron.generateKey('password', null, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad options');
                done();
            });
        });

        it('returns an error when an unknown algorithm is specified', function (done) {

            Iron.generateKey('password', { algorithm: 'unknown' }, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown algorithm: unknown');
                done();
            });
        });

        it('returns an error when no salt or salt bits are provided', function (done) {

            var options = {
                algorithm: 'sha256',
                iterations: 2
            };

            Iron.generateKey('password', options, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Missing salt or saltBits options');
                done();
            });
        });

        it('returns an error when invalid salt bits are provided', function (done) {

            var options = {
                saltBits: 99999999999999999999,
                algorithm: 'sha256',
                iterations: 2
            };

            Iron.generateKey('password', options, function (err) {

                expect(err).to.exist;
                expect(err.message).to.equal('Failed generating random bits: Argument #1 must be number > 0');
                done();
            });
        });

        it('returns an error when Cryptiles.randomBits fails', function (done) {

            var options = Hoek.clone(Iron.defaults.encryption);
            options.salt = 'abcdefg';
            options.algorithm = 'x';
            Iron.algorithms['x'] = { keyBits: 256, ivBits: -1 };

            Iron.generateKey('password', options, function (err, result) {

                expect(err).to.exist;
                expect(err.message).to.equal('Invalid random bits count');
                done();
            });
        });

        it('returns an error when Crypto.pbkdf2 fails', function (done) {

            var orig = Crypto.pbkdf2;
            Crypto.pbkdf2 = function (v1, v2, v3, v4, callback) {

                return callback(new Error('fake'));
            };

            Iron.generateKey('password', Iron.defaults.encryption, function (err, result) {

                Crypto.pbkdf2 = orig;
                expect(err).to.exist;
                expect(err.message).to.equal('fake');
                done();
            });
        });
    });

    describe('#encrypt', function () {

        it('returns an error when password is missing', function (done) {

            Iron.encrypt(null, null, 'data', function (err, encrypted, key) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });
    });

    describe('#decrypt', function () {

        it('returns an error when password is missing', function (done) {

            Iron.decrypt(null, null, 'data', function (err, encrypted, key) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });
    });

    describe('#hmacWithPassword ', function () {

        it('returns an error when password is missing', function (done) {

            Iron.hmacWithPassword(null, null, 'data', function (err, result) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('produces the same mac when used with buffer password', function (done) {

            var data = 'Not so random';
            var key = Cryptiles.randomBits(256);
            var hmac = Crypto.createHmac(Iron.defaults.integrity.algorithm, key).update(data);
            var digest = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/\=/g, '');

            Iron.hmacWithPassword(key, Iron.defaults.integrity, data, function (err, result) {

                expect(err).to.not.exist;
                expect(result.digest).to.equal(digest);
                done();
            });
        });
    });

    describe('#seal', function () {

        it('returns an error when password is missing', function (done) {

            Iron.seal('data', null, {}, function (err, sealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when integrity options are missing', function (done) {

            var options = {
                encryption: {
                    saltBits: 256,
                    algorithm: 'aes-256-cbc',
                    iterations: 1
                },
                integrity: {}
            };

            Iron.seal('data', 'password', options, function (err, sealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Unknown algorithm: undefined');
                done();
            });
        });

        it('returns an error when password.id is invalid', function (done) {

            Iron.seal('data', { id: 'asd$', secret: 'asd' }, {}, function (err, sealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Invalid password id');
                done();
            });
        });
    });

    describe('#unseal', function () {

        it('unseals a ticket', function (done) {
            var ticket = 'Fe26.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M**ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5*HfWzyJlz_UP9odmXvUaVK1TtdDuOCaezr-TAg2GjBCU';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.not.exist;
                expect(unsealed).to.deep.equal(obj);
                done();
            });
        });

        it('returns an error when number of sealed components is wrong', function (done) {

            var ticket = 'x*Fe26.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M**ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5*HfWzyJlz_UP9odmXvUaVK1TtdDuOCaezr-TAg2GjBCU';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Incorrect number of sealed components');
                done();
            });
        });

        it('returns an error when password is missing', function (done) {

            var ticket = 'Fe26.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M**ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5*HfWzyJlz_UP9odmXvUaVK1TtdDuOCaezr-TAg2GjBCU';
            Iron.unseal(ticket, null, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Empty password');
                done();
            });
        });

        it('returns an error when mac prefix is wrong', function (done) {

            var ticket = 'Fe27.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M**ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5*HfWzyJlz_UP9odmXvUaVK1TtdDuOCaezr-TAg2GjBCU';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Wrong mac prefix');
                done();
            });
        });

        it('returns an error when integrity check fails', function (done) {

            var ticket = 'Fe26.2**b3ad22402ccc60fa4d527f7d1c9ff2e37e9b2e5723e9e2ffba39a489e9849609*QKCeXLs6Rp7f4LL56V7hBg*OvZEoAq_nGOpA1zae-fAtl7VNCNdhZhCqo-hWFCBeWuTTpSupJ7LxQqzSQBRAcgw**72018a21d3fac5c1608a0f9e461de0fcf17b2befe97855978c17a793faa01db1*Qj53DFE3GZd5yigt-mVl9lnp0VUoSjh5a5jgDmod1EZ';
            Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                expect(err).to.exist;
                expect(err.message).to.equal('Bad hmac value');
                done();
            });
        });

        it('returns an error when decryption fails', function (done) {

            var macBaseString = 'Fe26.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M??*';
            var options = Hoek.clone(Iron.defaults.integrity);
            options.salt = 'ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5';
            Iron.hmacWithPassword(password, options, macBaseString, function (err, mac) {

                var ticket = macBaseString + '*' + mac.salt + '*' + mac.digest;
                Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Invalid character');
                    done();
                });
            });
        });

        it('returns an error when iv base64 decoding fails', function (done) {

            var macBaseString = 'Fe26.2**a6dc6339e5ea5dfe7a135631cf3b7dcf47ea38246369d45767c928ea81781694*D3DLEoi-Hn3c972TPpZXqw??*mCBhmhHhRKk9KtBjwu3h-1lx1MHKkgloQPKRkQZxpnDwYnFkb3RqdVTQRcuhGf4M*';
            var options = Hoek.clone(Iron.defaults.integrity);
            options.salt = 'ff2bf988aa0edf2b34c02d220a45c4a3c572dac6b995771ed20de58da919bfa5';
            Iron.hmacWithPassword(password, options, macBaseString, function (err, mac) {

                var ticket = macBaseString + '*' + mac.salt + '*' + mac.digest;
                Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Invalid character');
                    done();
                });
            });
        });

        it('returns an error when decrypted object is invalid', function (done) {

            var badJson = '{asdasd';
            Iron.encrypt(password, Iron.defaults.encryption, badJson, function (err, encrypted, key) {

                var encryptedB64 = Hoek.base64urlEncode(encrypted);
                var iv = Hoek.base64urlEncode(key.iv);
                var macBaseString = Iron.macPrefix + '**' + key.salt + '*' + iv + '*' + encryptedB64 + '*';
                Iron.hmacWithPassword(password, Iron.defaults.integrity, macBaseString, function (err, mac) {

                    var ticket = macBaseString + '*' + mac.salt + '*' + mac.digest;
                    Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                        expect(err).to.exist;
                        expect(err.message).to.equal('Failed parsing sealed object JSON: Unexpected token a');
                        done();
                    });
                });
            });
        });

        it('returns an error when expired', function (done) {

            var macBaseString = 'Fe26.2**a38dc7a7bf2f8ff650b103d8c669d76ad219527fbfff3d98e3b30bbecbe9bd3b*nTsatb7AQE1t0uMXDx-2aw*uIO5bRFTwEBlPC1Nd_hfSkZfqxkxuY1EO2Be_jJPNQCqFNumRBjQAl8WIKBW1beF*1380495854060';
            var options = Hoek.clone(Iron.defaults.integrity);
            options.salt = 'e4fe33b6dc4c7ef5ad7907f015deb7b03723b03a54764aceeb2ab1235cc8dce3';
            Iron.hmacWithPassword(password, options, macBaseString, function (err, mac) {

                var ticket = macBaseString + '*' + mac.salt + '*' + mac.digest;
                Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Expired seal');
                    done();
                });
            });
        });

        it('returns an error when expiration NaN', function (done) {

            var macBaseString = 'Fe26.2**a38dc7a7bf2f8ff650b103d8c669d76ad219527fbfff3d98e3b30bbecbe9bd3b*nTsatb7AQE1t0uMXDx-2aw*uIO5bRFTwEBlPC1Nd_hfSkZfqxkxuY1EO2Be_jJPNQCqFNumRBjQAl8WIKBW1beF*a';
            var options = Hoek.clone(Iron.defaults.integrity);
            options.salt = 'e4fe33b6dc4c7ef5ad7907f015deb7b03723b03a54764aceeb2ab1235cc8dce3';
            Iron.hmacWithPassword(password, options, macBaseString, function (err, mac) {

                var ticket = macBaseString + '*' + mac.salt + '*' + mac.digest;
                Iron.unseal(ticket, password, Iron.defaults, function (err, unsealed) {

                    expect(err).to.exist;
                    expect(err.message).to.equal('Invalid expiration');
                    done();
                });
            });
        });
    });
});
