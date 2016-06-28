// Load modules

var Code = require('code');
var Hapi = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Server', function () {

    it('does not cache etags', function (done) {

        var server = new Hapi.Server({ files: { etagsCacheMaxSize: 0 } });
        server.connection({ routes: { files: { relativeTo: __dirname } } });
        server.route({ method: 'GET', path: '/note', handler: { file: './file/note.txt' } });

        server.inject('/note', function (res1) {

            expect(res1.statusCode).to.equal(200);
            expect(res1.result).to.equal('Test');
            expect(res1.headers.etag).to.not.exist();

            server.inject('/note', function (res2) {

                expect(res2.statusCode).to.equal(200);
                expect(res2.result).to.equal('Test');
                expect(res2.headers.etag).to.not.exist();
                done();
            });
        });
    });

    it('sets connections defaults', function (done) {

        var server = new Hapi.Server({ connections: { app: { message: 'test defaults' } } });
        server.connection();
        expect(server.connections[0].settings.app.message).to.equal('test defaults');
        done();
    });

    it('overrides mime settings', function (done) {

        var options = {
            mime: {
                override: {
                    'node/module': {
                        source: 'steve',
                        compressible: false,
                        extensions: ['node', 'module', 'npm'],
                        type: 'node/module'
                    }
                }
            }
        };

        var server = new Hapi.Server(options);
        expect(server.mime.path('file.npm').type).to.equal('node/module');
        expect(server.mime.path('file.npm').source).to.equal('steve');
        done();
    });

    it('skips loading built-in plugins', function (done) {

        var server = new Hapi.Server({ minimal: true });
        expect(server.views).to.not.exist();
        done();
    });

    describe('start()', function () {

        it('starts and stops', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['s1', 'a', 'b'] });
            server.connection({ labels: ['s2', 'a', 'test'] });
            server.connection({ labels: ['s3', 'a', 'b', 'd', 'cache'] });
            server.connection({ labels: ['s4', 'b', 'test', 'cache'] });

            var started = 0;
            var stopped = 0;

            server.on('start', function () {

                ++started;
            });

            server.on('stop', function () {

                ++stopped;
            });

            server.start(function () {

                server.connections.forEach(function (connection) {

                    expect(connection._started).to.equal(true);
                });

                server.stop(function () {

                    server.connections.forEach(function (connection) {

                        expect(connection._started).to.equal(false);
                    });

                    expect(started).to.equal(1);
                    expect(stopped).to.equal(1);
                    done();
                });
            });
        });

        it('starts a server without callback', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.start();
            setTimeout(function () {

                server.stop();
                done();
            }, 10);
        });

        it('errors on bad cache start', function (done) {

            var cache = {
                engine: {
                    start: function (callback) {

                        return callback(new Error('oops'));
                    }
                }
            };

            var server = new Hapi.Server({ cache: cache });
            server.connection();
            server.start(function (err) {

                expect(err.message).to.equal('oops');
                done();
            });
        });

        it('fails to start server without connections', function (done) {

            var server = new Hapi.Server();
            expect(function () {

                server.start();
            }).to.throw('No connections to start');
            done();
        });
    });

    describe('stop()', function () {

        it('stops the cache', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var cache = server.cache({ segment: 'test', expiresIn: 1000 });
            server.start(function () {

                cache.set('a', 'going in', 0, function (err) {

                    cache.get('a', function (err, value1, cached1, report1) {

                        expect(value1).to.equal('going in');

                        server.stop(function () {

                            cache.get('a', function (err, value2, cached2, report2) {

                                expect(value2).to.equal(null);
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('stops with only an option object', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.connections[0]._stop = function (options, callback) {

                expect(options).to.deep.equal({
                    timeout: 1
                });
                done();
            };

            server.stop({
                timeout: 1
            });
        });
    });

    describe('connection()', function () {

        it('returns a server with only the selected connection', function (done) {

            var server = new Hapi.Server();
            var p1 = server.connection({ port: 1 });
            var p2 = server.connection({ port: 2 });

            expect(server.connections.length).to.equal(2);
            expect(p1.connections.length).to.equal(1);
            expect(p2.connections.length).to.equal(1);
            expect(p1.connections[0].settings.port).to.equal(1);
            expect(p2.connections[0].settings.port).to.equal(2);
            done();
        });

        it('throws on invalid config', function (done) {

            var server = new Hapi.Server();
            expect(function () {

                server.connection({ something: false });
            }).to.throw(/Invalid connection options/);
            done();
        });

        it('combines configuration from server and connection (cors)', function (done) {

            var server = new Hapi.Server({ connections: { routes: { cors: true } } });
            server.connection({ routes: { cors: { origin: ['example.com'] } } });
            expect(server.connections[0].settings.routes.cors.origin).to.deep.equal(['example.com']);
            done();
        });

        it('combines configuration from server and connection (security)', function (done) {

            var server = new Hapi.Server({ connections: { routes: { security: { hsts: 1, xss: false } } } });
            server.connection({ routes: { security: { hsts: 2 } } });
            expect(server.connections[0].settings.routes.security.hsts).to.equal(2);
            expect(server.connections[0].settings.routes.security.xss).to.be.false();
            expect(server.connections[0].settings.routes.security.xframe).to.equal('deny');
            done();
        });
    });

    describe('load', { parallel: false }, function () {

        it('measures loop delay', function (done) {

            var server = new Hapi.Server({ load: { sampleInterval: 4 } });
            server.connection();

            var handler = function (request, reply) {

                var start = Date.now();
                while (Date.now() - start < 5) { }
                return reply('ok');
            };

            server.route({ method: 'GET', path: '/', handler: handler });
            server.start(function (err) {

                server.inject('/', function (res1) {

                    expect(server.load.eventLoopDelay).to.equal(0);

                    setImmediate(function () {

                        server.inject('/', function (res2) {

                            expect(server.load.eventLoopDelay).to.be.above(0);

                            setImmediate(function () {

                                server.inject('/', function (res3) {

                                    expect(server.load.eventLoopDelay).to.be.above(0);
                                    expect(server.load.heapUsed).to.be.above(1024 * 1024);
                                    expect(server.load.rss).to.be.above(1024 * 1024);
                                    server.stop(function () {

                                        done();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
});
