// Load modules

var Catbox = require('..');
var Code = require('code');
var Lab = require('lab');
var Import = require('./import');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.experiment;
var it = lab.test;
var expect = Code.expect;


describe('Catbox', function () {

    it('creates a new connection', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            done();
        });
    });

    it('closes the connection', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            client.stop();
            expect(client.isReady()).to.equal(false);
            done();
        });
    });

    it('gets an item after setting it', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 500, function (err) {

                expect(err).to.not.exist();
                client.get(key, function (err, result) {

                    expect(err).to.equal(null);
                    expect(result.item).to.equal('123');
                    done();
                });
            });
        });
    });

    it('fails setting an item circular references', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            var value = { a: 1 };
            value.b = value;
            client.set(key, value, 10, function (err) {

                expect(err.message).to.equal('Converting circular structure to JSON');
                done();
            });
        });
    });

    it('ignored starting a connection twice on same event', function (done) {

        var client = new Catbox.Client(Import);
        var x = 2;
        var start = function () {

            client.start(function (err) {

                expect(client.isReady()).to.equal(true);
                --x;
                if (!x) {
                    done();
                }
            });
        };

        start();
        start();
    });

    it('ignored starting a connection twice chained', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            expect(err).to.not.exist();
            expect(client.isReady()).to.equal(true);

            client.start(function (err) {

                expect(err).to.not.exist();
                expect(client.isReady()).to.equal(true);
                done();
            });
        });
    });

    it('returns not found on get when using null key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.get(null, function (err, result) {

                expect(err).to.equal(null);
                expect(result).to.equal(null);
                done();
            });
        });
    });

    it('returns not found on get when item expired', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, 'x', 1, function (err) {

                expect(err).to.not.exist();
                setTimeout(function () {

                    client.get(key, function (err, result) {

                        expect(err).to.equal(null);
                        expect(result).to.equal(null);
                        done();
                    });
                }, 2);
            });
        });
    });

    it('returns error on set when using null key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.set(null, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on get when using invalid key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.get({}, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on drop when using invalid key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.drop({}, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on set when using invalid key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.set({}, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('ignores set when using non-positive ttl value', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, 'y', 0, function (err) {

                expect(err).to.not.exist();
                done();
            });
        });
    });

    it('returns error on drop when using null key', function (done) {

        var client = new Catbox.Client(Import);
        client.start(function (err) {

            client.drop(null, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('returns error on get when stopped', function (done) {

        var client = new Catbox.Client(Import);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.get(key, function (err, result) {

            expect(err).to.exist();
            expect(result).to.not.exist();
            done();
        });
    });

    it('returns error on set when stopped', function (done) {

        var client = new Catbox.Client(Import);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.set(key, 'y', 1, function (err) {

            expect(err).to.exist();
            done();
        });
    });

    it('returns error on drop when stopped', function (done) {

        var client = new Catbox.Client(Import);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.drop(key, function (err) {

            expect(err).to.exist();
            done();
        });
    });

    it('returns error on missing segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Import);
            var cache = new Catbox.Policy(config, client, '');
        };
        expect(fn).to.throw(Error);
        done();
    });

    it('returns error on bad segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Import);
            var cache = new Catbox.Policy(config, client, 'a\0b');
        };
        expect(fn).to.throw(Error);
        done();
    });

    it('returns error when cache item dropped while stopped', function (done) {

        var client = new Catbox.Client(Import);
        client.stop();
        client.drop('a', function (err) {

            expect(err).to.exist();
            done();
        });
    });
});
