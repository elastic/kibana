// Load modules

var Http = require('http');
var Stream = require('stream');
var Bluebird = require('bluebird');
var Boom = require('boom');
var Code = require('code');
var Hapi = require('..');
var Hoek = require('hoek');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Reply', function () {

    it('throws when reply called twice', function (done) {

        var handler = function (request, reply) {

            reply('ok'); return reply('not ok');
        };

        var server = new Hapi.Server({ debug: false });
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('redirects from handler', function (done) {

        var handler = function (request, reply) {

            return reply.redirect('/elsewhere');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(302);
            expect(res.headers.location).to.equal('/elsewhere');
            done();
        });
    });

    describe('interface()', function () {

        it('uses reply(null, result) for result', function (done) {

            var handler = function (request, reply) {

                return reply(null, 'steve');
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('steve');
                done();
            });
        });

        it('uses reply(null, err) for err', function (done) {

            var handler = function (request, reply) {

                return reply(null, Boom.badRequest());
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('ignores result when err provided in reply(err, result)', function (done) {

            var handler = function (request, reply) {

                return reply(Boom.badRequest(), 'steve');
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(400);
                done();
            });
        });

        it('skips decorations on minimal server', function (done) {

            var handler = function (request, reply) {

                return reply(reply.view === undefined);
            };

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.result).to.equal(true);
                done();
            });
        });
    });

    describe('response()', function () {

        it('returns null', function (done) {

            var handler = function (request, reply) {

                return reply(null, null);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal(null);
                expect(res.payload).to.equal('');
                expect(res.headers['content-type']).to.not.exist();
                done();
            });
        });

        it('returns a buffer reply', function (done) {

            var handler = function (request, reply) {

                return reply(new Buffer('Tada1')).code(299);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', config: { handler: handler } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(299);
                expect(res.result).to.equal('Tada1');
                expect(res.headers['content-type']).to.equal('application/octet-stream');
                done();
            });
        });

        it('returns an object response', function (done) {

            var handler = function (request, reply) {

                return reply({ a: 1, b: 2 });
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.payload).to.equal('{\"a\":1,\"b\":2}');
                expect(res.headers['content-length']).to.equal(13);
                done();
            });
        });

        it('returns false', function (done) {

            var handler = function (request, reply) {

                return reply(false);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.payload).to.equal('false');
                done();
            });
        });

        it('returns an error reply', function (done) {

            var handler = function (request, reply) {

                return reply(new Error('boom'));
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                expect(res.result).to.exist();
                done();
            });
        });

        it('returns an empty reply', function (done) {

            var handler = function (request, reply) {

                return reply().code(299);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { credentials: true } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(299);
                expect(res.result).to.equal(null);
                expect(res.headers['access-control-allow-credentials']).to.equal('true');
                done();
            });
        });

        it('returns a stream reply', function (done) {

            var TestStream = function () {

                Stream.Readable.call(this);
            };

            Hoek.inherits(TestStream, Stream.Readable);

            TestStream.prototype._read = function (size) {

                if (this.isDone) {
                    return;
                }
                this.isDone = true;

                this.push('x');
                this.push('y');
                this.push(null);
            };

            var handler = function (request, reply) {

                return reply(new TestStream()).ttl(2000);
            };

            var server = new Hapi.Server();
            server.connection({ routes: { cors: { origin: ['test.example.com'] } } });
            server.route({ method: 'GET', path: '/stream', config: { handler: handler, cache: { expiresIn: 9999 } } });

            server.inject('/stream', function (res1) {

                expect(res1.result).to.equal('xy');
                expect(res1.statusCode).to.equal(200);
                expect(res1.headers['cache-control']).to.equal('max-age=2, must-revalidate');
                expect(res1.headers['access-control-allow-origin']).to.equal('test.example.com');

                server.inject({ method: 'HEAD', url: '/stream' }, function (res2) {

                    expect(res2.result).to.equal('');
                    expect(res2.statusCode).to.equal(200);
                    expect(res2.headers['cache-control']).to.equal('max-age=2, must-revalidate');
                    expect(res2.headers['access-control-allow-origin']).to.equal('test.example.com');
                    done();
                });
            });
        });

        it('errors on non-readable stream reply', function (done) {

            var streamHandler = function (request, reply) {

                var stream = new Stream();
                stream.writable = true;

                reply(stream);
            };

            var writableHandler = function (request, reply) {

                var writable = new Stream.Writable();
                writable._write = function () {};

                reply(writable);
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/stream', handler: streamHandler });
            server.route({ method: 'GET', path: '/writable', handler: writableHandler });

            var requestError;
            server.on('request-error', function (request, err) {

                requestError = err;
            });

            server.start(function () {

                server.inject('/stream', function (res1) {

                    expect(res1.statusCode).to.equal(500);
                    expect(requestError).to.exist();
                    expect(requestError.message).to.equal('Stream must have a streams2 readable interface');

                    requestError = undefined;
                    server.inject('/writable', function (res2) {

                        expect(res2.statusCode).to.equal(500);
                        expect(requestError).to.exist();
                        expect(requestError.message).to.equal('Stream must have a streams2 readable interface');
                        done();
                    });
                });
            });
        });

        it('errors on an http client stream reply', function (done) {

            var handler = function (request, reply) {

                reply('just a string');
            };

            var streamHandler = function (request, reply) {

                reply(Http.get(request.server.info + '/'));
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.route({ method: 'GET', path: '/stream', handler: streamHandler });

            server.start(function () {

                server.inject('/stream', function (res) {

                    expect(res.statusCode).to.equal(500);
                    done();
                });
            });
        });

        it('errors on objectMode stream reply', function (done) {

            var TestStream = function () {

                Stream.Readable.call(this, { objectMode: true });
            };

            Hoek.inherits(TestStream, Stream.Readable);

            TestStream.prototype._read = function (size) {

                if (this.isDone) {
                    return;
                }
                this.isDone = true;

                this.push({ x: 1 });
                this.push({ y: 1 });
                this.push(null);
            };

            var handler = function (request, reply) {

                return reply(new TestStream());
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        describe('promises', function () {

            it('returns a stream', function (done) {

                var TestStream = function () {

                    Stream.Readable.call(this);

                    this.statusCode = 200;
                };

                Hoek.inherits(TestStream, Stream.Readable);

                TestStream.prototype._read = function (size) {

                    if (this.isDone) {
                        return;
                    }
                    this.isDone = true;

                    this.push('x');
                    this.push('y');
                    this.push(null);
                };

                var handler = function (request, reply) {

                    return reply(Bluebird.resolve(new TestStream())).ttl(2000).code(299);
                };

                var server = new Hapi.Server({ debug: false });
                server.connection({ routes: { cors: { origin: ['test.example.com'] } } });
                server.route({ method: 'GET', path: '/stream', config: { handler: handler, cache: { expiresIn: 9999 } } });

                server.inject('/stream', function (res) {

                    expect(res.result).to.equal('xy');
                    expect(res.statusCode).to.equal(299);
                    expect(res.headers['cache-control']).to.equal('max-age=2, must-revalidate');
                    expect(res.headers['access-control-allow-origin']).to.equal('test.example.com');
                    done();
                });
            });

            it('returns a buffer', function (done) {

                var handler = function (request, reply) {

                    return reply(Bluebird.resolve(new Buffer('buffer content'))).code(299).type('something/special');
                };

                var server = new Hapi.Server();
                server.connection();
                server.route({ method: 'GET', path: '/', handler: handler });

                server.inject('/', function (res) {

                    expect(res.statusCode).to.equal(299);
                    expect(res.result.toString()).to.equal('buffer content');
                    expect(res.headers['content-type']).to.equal('something/special');
                    done();
                });
            });
        });
    });

    describe('hold()', function () {

        it('undo scheduled next tick in reply interface', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var handler = function (request, reply) {

                return reply('123').hold().send();
            };

            server.route({ method: 'GET', path: '/domain', handler: handler });

            server.inject('/domain', function (res) {

                expect(res.result).to.equal('123');
                done();
            });
        });

        it('sends reply after timed handler', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var handler = function (request, reply) {

                var response = reply('123').hold();
                setTimeout(function () {

                    response.send();
                }, 10);
            };

            server.route({ method: 'GET', path: '/domain', handler: handler });

            server.inject('/domain', function (res) {

                expect(res.result).to.equal('123');
                done();
            });
        });
    });

    describe('close()', function () {

        it('returns a reply with manual end', function (done) {

            var handler = function (request, reply) {

                request.raw.res.end();
                return reply.close({ end: false });
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', config: { handler: handler } });

            server.inject('/', function (res) {

                expect(res.result).to.equal('');
                done();
            });
        });

        it('returns a reply with auto end', function (done) {

            var handler = function (request, reply) {

                return reply.close();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', config: { handler: handler } });

            server.inject('/', function (res) {

                expect(res.result).to.equal('');
                done();
            });
        });
    });

    describe('continue()', function () {

        it('sets empty reply on continue in handler', function (done) {

            var handler = function (request, reply) {

                return reply.continue();
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', config: { handler: handler } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal(null);
                expect(res.payload).to.equal('');
                done();
            });
        });

        it('sets empty reply on continue in prerequisite', function (done) {

            var pre1 = function (request, reply) {

                return reply.continue();
            };

            var pre2 = function (request, reply) {

                return reply.continue();
            };

            var pre3 = function (request, reply) {

                return reply({
                    m1: request.pre.m1,
                    m2: request.pre.m2
                });
            };

            var handler = function (request, reply) {

                return reply(request.pre.m3);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        { method: pre1, assign: 'm1' },
                        { method: pre2, assign: 'm2' },
                        { method: pre3, assign: 'm3' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.deep.equal({
                    m1: null,
                    m2: null
                });
                expect(res.payload).to.equal('{"m1":null,"m2":null}');
                done();
            });
        });
    });
});
