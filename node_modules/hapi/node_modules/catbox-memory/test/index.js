// Load modules

var Code = require('code');
var Lab = require('lab');
var Catbox = require('catbox');
var Memory = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Memory', function () {

    it('throws an error if not created with new', function (done) {

        var fn = function () {

            Memory();
        };

        expect(fn).to.throw(Error);
        done();
    });

    it('creates a new connection', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            done();
        });
    });

    it('closes the connection', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            expect(client.isReady()).to.equal(true);
            client.stop();
            expect(client.isReady()).to.equal(false);
            done();
        });
    });

    it('gets an item after setting it', function (done) {

        var client = new Catbox.Client(Memory);
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

    it('buffers can be set and retrieved when allowMixedContent is true', function (done) {

        var buffer = new Buffer('string value');
        var client = new Catbox.Client(new Memory({ allowMixedContent: true }));

        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };

            client.set(key, buffer, 500, function (err) {

                expect(err).to.not.exist();
                client.get(key, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result.item instanceof Buffer).to.equal(true);
                    expect(result.item).to.deep.equal(buffer);
                    done();
                });
            });
        });
    });

    it('buffers are copied before storing when allowMixedContent is true', function (done) {

        var buffer = new Buffer('string value');
        var client = new Catbox.Client(new Memory({ allowMixedContent: true }));

        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };

            client.set(key, buffer, 500, function (err) {

                expect(err).to.not.exist();
                client.get(key, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result.item).to.not.equal(buffer);
                    done();
                });
            });
        });
    });

    it('buffers are stringified when allowMixedContent is not true', function (done) {

        var buffer = new Buffer('string value');
        var client = new Catbox.Client(new Memory());

        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };

            client.set(key, buffer, 500, function (err) {

                expect(err).to.not.exist();
                client.get(key, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result.item instanceof Buffer).to.equal(false);
                    expect(result.item).to.deep.equal(JSON.parse(JSON.stringify(buffer)));
                    done();
                });
            });
        });
    });

    it('gets an item after setting it (no memory limit)', function (done) {

        var client = new Catbox.Client(new Memory({ maxByteSize: 0 }));
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', 500, function (err) {

                expect(err).to.not.exist();
                client.get(key, function (err, result) {

                    expect(err).to.equal(null);
                    expect(result.item).to.equal('123');

                    client.set(key, '345', 500, function (err) {

                        expect(err).to.not.exist();
                        client.get(key, function (err, result) {

                            expect(err).to.equal(null);
                            expect(result.item).to.equal('345');
                            done();
                        });
                    });
                });
            });
        });
    });

    it('fails setting an item circular references', function (done) {

        var client = new Catbox.Client(Memory);
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

    it('fails setting an item with very long ttl', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, '123', Math.pow(2, 31), function (err) {

                expect(err.message).to.equal('Invalid ttl (greater than 2147483647)');
                done();
            });
        });
    });

    it('ignored starting a connection twice on same event', function (done) {

        var client = new Catbox.Client(Memory);
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

        var client = new Catbox.Client(Memory);
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

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            client.get(null, function (err, result) {

                expect(err).to.equal(null);
                expect(result).to.equal(null);
                done();
            });
        });
    });

    it('returns not found on get when item expired', function (done) {

        var client = new Catbox.Client(Memory);
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

    it('errors on set when using null key', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            client.set(null, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('errors on get when using invalid key', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            client.get({}, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('errors on set when using invalid key', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            client.set({}, {}, 1000, function (err) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });
    });

    it('ignores set when using non-positive ttl value', function (done) {

        var client = new Catbox.Client(Memory);
        client.start(function (err) {

            var key = { id: 'x', segment: 'test' };
            client.set(key, 'y', 0, function (err) {

                expect(err).to.not.exist();
                done();
            });
        });
    });

    it('errors on get when stopped', function (done) {

        var client = new Catbox.Client(Memory);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.get(key, function (err, result) {

            expect(err).to.exist();
            expect(result).to.not.exist();
            done();
        });
    });

    it('errors on set when stopped', function (done) {

        var client = new Catbox.Client(Memory);
        client.stop();
        var key = { id: 'x', segment: 'test' };
        client.connection.set(key, 'y', 1, function (err) {

            expect(err).to.exist();
            done();
        });
    });

    it('errors on missing segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Memory);
            var cache = new Catbox.Policy(config, client, '');
        };
        expect(fn).to.throw(Error);
        done();
    });

    it('errors on bad segment name', function (done) {

        var config = {
            expiresIn: 50000
        };
        var fn = function () {

            var client = new Catbox.Client(Memory);
            var cache = new Catbox.Policy(config, client, 'a\0b');
        };
        expect(fn).to.throw(Error);
        done();
    });

    describe('start()', function () {

        it('creates an empty cache object', function (done) {

            var memory = new Memory();
            expect(memory.cache).to.not.exist();
            memory.start(function () {

                expect(memory.cache).to.exist();
                done();
            });
        });
    });

    describe('stop()', function () {

        it('sets the cache object to null', function (done) {

            var memory = new Memory();
            expect(memory.cache).to.not.exist();
            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.stop();
                expect(memory.cache).to.not.exist();
                done();
            });
        });
    });

    describe('get()', function () {

        it('errors on invalid json in cache', function (done) {

            var key = {
                segment: 'test',
                id: 'test'
            };

            var memory = new Memory();
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key, 'myvalue', 10, function () {

                    expect(memory.cache[key.segment][key.id].item).to.equal('"myvalue"');
                    memory.cache[key.segment][key.id].item = '"myvalue';
                    memory.get(key, function (err, result) {

                        expect(err.message).to.equal('Bad value content');
                        done();
                    });
                });
            });
        });

        it('returns not found on missing segment', function (done) {

            var key = {
                segment: 'test',
                id: 'test'
            };

            var memory = new Memory();
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.get(key, function (err, result) {

                    expect(err).to.not.exist();
                    expect(result).to.not.exist();
                    done();
                });
            });
        });
    });

    describe('set()', function () {

        it('adds an item to the cache object', function (done) {

            var key = {
                segment: 'test',
                id: 'test'
            };

            var memory = new Memory();
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key, 'myvalue', 10, function () {

                    expect(memory.cache[key.segment][key.id].item).to.equal('"myvalue"');
                    done();
                });
            });
        });

        it('removes an item from the cache object when it expires', function (done) {

            var key = {
                segment: 'test',
                id: 'test'
            };

            var memory = new Memory();
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key, 'myvalue', 10, function () {

                    expect(memory.cache[key.segment][key.id].item).to.equal('"myvalue"');
                    setTimeout(function () {

                        expect(memory.cache[key.segment][key.id]).to.not.exist();
                        done();
                    }, 15);
                });
            });
        });

        it('errors when the maxByteSize has been reached', function (done) {

            var key = {
                segment: 'test',
                id: 'test'
            };

            var memory = new Memory({ maxByteSize: 4 });
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key, 'myvalue', 10, function (err) {

                    expect(err).to.exist();
                    expect(err).to.be.instanceOf(Error);
                    done();
                });
            });
        });

        it('increments the byte size when an item is inserted and errors when the limit is reached', function (done) {

            var key1 = {
                segment: 'test',
                id: 'test'
            };

            var key2 = {
                segment: 'test',
                id: 'test2'
            };

            // maxByteSize is slightly larger than the first key so we are left with a small
            // amount of free space, but not enough for the second key to be created.
            var memory = new Memory({ maxByteSize: 200 });
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key1, 'my', 10, function (err) {

                    expect(err).to.not.exist();
                    expect(memory.cache[key1.segment][key1.id].item).to.equal('"my"');

                    memory.set(key2, 'myvalue', 10, function (err) {

                        expect(err).to.exist();
                        done();
                    });
                });
            });
        });

        it('increments the byte size when an object is inserted', function (done) {

            var key1 = {
                segment: 'test',
                id: 'test'
            };
            var itemToStore = {
                my: {
                    array: [1, 2, 3],
                    bool: true,
                    string: 'test'
                }
            };

            var memory = new Memory({ maxByteSize: 2000 });
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key1, itemToStore, 10, function () {

                    expect(memory.byteSize).to.equal(204);
                    expect(memory.cache[key1.segment][key1.id].byteSize).to.equal(204);
                    expect(memory.cache[key1.segment][key1.id].item).to.exist();
                    done();
                });
            });
        });

        it('leaves the byte size unchanged when an object overrides existing key with same size', function (done) {

            var key1 = {
                segment: 'test',
                id: 'test'
            };
            var itemToStore = {
                my: {
                    array: [1, 2, 3],
                    bool: true,
                    string: 'test',
                    undefined: undefined
                }
            };

            var memory = new Memory({ maxByteSize: 2000 });
            expect(memory.cache).to.not.exist();

            memory.start(function () {

                expect(memory.cache).to.exist();
                memory.set(key1, itemToStore, 10, function () {

                    expect(memory.cache[key1.segment][key1.id].byteSize).to.equal(204);
                    expect(memory.cache[key1.segment][key1.id].item).to.exist();
                    memory.set(key1, itemToStore, 10, function () {

                        expect(memory.cache[key1.segment][key1.id].byteSize).to.equal(204);
                        expect(memory.cache[key1.segment][key1.id].item).to.exist();
                        done();
                    });
                });
            });
        });
    });

    describe('drop()', function () {

        it('drops an existing item', function (done) {

            var client = new Catbox.Client(Memory);
            client.start(function (err) {

                var key = { id: 'x', segment: 'test' };
                client.set(key, '123', 500, function (err) {

                    expect(err).to.not.exist();
                    client.get(key, function (err, result) {

                        expect(err).to.equal(null);
                        expect(result.item).to.equal('123');
                        client.drop(key, function (err) {

                            expect(err).to.not.exist();
                            done();
                        });
                    });
                });
            });
        });

        it('drops an item from a missing segment', function (done) {

            var client = new Catbox.Client(Memory);
            client.start(function (err) {

                var key = { id: 'x', segment: 'test' };
                client.drop(key, function (err) {

                    expect(err).to.not.exist();
                    done();
                });
            });
        });

        it('drops a missing item', function (done) {

            var client = new Catbox.Client(Memory);
            client.start(function (err) {

                var key = { id: 'x', segment: 'test' };
                client.set(key, '123', 500, function (err) {

                    expect(err).to.not.exist();
                    client.get(key, function (err, result) {

                        expect(err).to.equal(null);
                        expect(result.item).to.equal('123');
                        client.drop({ id: 'y', segment: 'test' }, function (err) {

                            expect(err).to.not.exist();
                            done();
                        });
                    });
                });
            });
        });

        it('errors on drop when using invalid key', function (done) {

            var client = new Catbox.Client(Memory);
            client.start(function (err) {

                client.drop({}, function (err) {

                    expect(err instanceof Error).to.equal(true);
                    done();
                });
            });
        });

        it('errors on drop when using null key', function (done) {

            var client = new Catbox.Client(Memory);
            client.start(function (err) {

                client.drop(null, function (err) {

                    expect(err instanceof Error).to.equal(true);
                    done();
                });
            });
        });

        it('errors on drop when stopped', function (done) {

            var client = new Catbox.Client(Memory);
            client.stop();
            var key = { id: 'x', segment: 'test' };
            client.connection.drop(key, function (err) {

                expect(err).to.exist();
                done();
            });
        });

        it('errors when cache item dropped while stopped', function (done) {

            var client = new Catbox.Client(Memory);
            client.stop();
            client.drop('a', function (err) {

                expect(err).to.exist();
                done();
            });
        });
    });

    describe('validateSegmentName()', function () {

        it('errors when the name is empty', function (done) {

            var memory = new Memory();
            var result = memory.validateSegmentName('');

            expect(result).to.be.instanceOf(Error);
            expect(result.message).to.equal('Empty string');
            done();
        });

        it('errors when the name has a null character', function (done) {

            var memory = new Memory();
            var result = memory.validateSegmentName('\0test');

            expect(result).to.be.instanceOf(Error);
            done();
        });

        it('returns null when there are no errors', function (done) {

            var memory = new Memory();
            var result = memory.validateSegmentName('valid');

            expect(result).to.not.be.instanceOf(Error);
            expect(result).to.equal(null);
            done();
        });
    });
});
