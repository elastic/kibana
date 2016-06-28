// Load modules

var Fs = require('fs');
var Http = require('http');
var Net = require('net');
var Zlib = require('zlib');
var Boom = require('boom');
var Code = require('code');
var H2o2 = require('..');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Lab = require('lab');
var Wreck = require('wreck');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('H2o2', function () {

    var provisionServer = function (options) {

        var server = new Hapi.Server({ minimal: true });
        server.connection(options);
        server.register(H2o2, Hoek.ignore);
        return server;
    };

    it('overrides maxSockets', { parallel: false }, function (done) {

        var orig = Wreck.request;
        Wreck.request = function (method, uri, options, callback) {

            Wreck.request = orig;
            expect(options.agent.maxSockets).to.equal(213);
            done();
        };

        var server = provisionServer();
        server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', maxSockets: 213 } } });
        server.inject('/', function (res) { });
    });

    it('uses node default with maxSockets set to false', { parallel: false }, function (done) {

        var orig = Wreck.request;
        Wreck.request = function (method, uri, options, callback) {

            Wreck.request = orig;
            expect(options.agent).to.equal(undefined);
            done();
        };

        var server = provisionServer();
        server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', maxSockets: false } } });
        server.inject('/', function (res) { });
    });

    it('forwards on the response when making a GET request', function (done) {

        var profile = function (request, reply) {

            reply({ id: 'fa0dbda9b1b', name: 'John Doe' }).state('test', '123');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/profile', handler: profile, config: { cache: { expiresIn: 2000 } } });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/profile', handler: { proxy: { host: 'localhost', port: upstream.info.port, xforward: true, passThrough: true } } });
            server.state('auto', { autoValue: 'xyz' });

            server.inject('/profile', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.contain('John Doe');
                expect(res.headers['set-cookie']).to.deep.equal(['test=123', 'auto=xyz']);
                expect(res.headers['cache-control']).to.equal('max-age=2, must-revalidate, private');

                server.inject('/profile', function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.payload).to.contain('John Doe');
                    done();
                });
            });
        });
    });

    it('throws when used with explicit route payload config other than data or steam', function (done) {

        var server = provisionServer();
        expect(function () {

            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: {
                        proxy: { host: 'example.com' }
                    },
                    payload: {
                        output: 'file'
                    }
                }
            });
        }).to.throw('Cannot proxy if payload is parsed or if output is not stream or data');
        done();
    });

    it('throws when setup with invalid options', function (done) {

        var server = provisionServer();
        expect(function () {

            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: {
                        proxy: { some: 'key' }
                    }
                }
            });
        }).to.throw(/\"value\" must contain at least one of \[host, mapUri, uri\]/);
        done();
    });

    it('throws when used with explicit route payload parse config set to false', function (done) {

        var server = provisionServer();
        expect(function () {

            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: {
                        proxy: { host: 'example.com' }
                    },
                    payload: {
                        parse: true
                    }
                }
            });
        }).to.throw('Cannot proxy if payload is parsed or if output is not stream or data');
        done();
    });

    it('allows when used with explicit route payload output data config', function (done) {

        var server = provisionServer();
        expect(function () {

            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: {
                        proxy: { host: 'example.com' }
                    },
                    payload: {
                        output: 'data'
                    }
                }
            });
        }).to.not.throw();
        done();
    });

    it('uses protocol without ":"', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.info.port, protocol: 'http' } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('ok');
                done();
            });
        });
    });

    it('forwards upstream headers', function (done) {

        var headers = function (request, reply) {

            reply({ status: 'success' })
                .header('Custom1', 'custom header value 1')
                .header('X-Custom2', 'custom header value 2');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/headers', handler: headers });
        upstream.start(function () {

            var server = provisionServer({ routes: { cors: true } });
            server.route({ method: 'GET', path: '/headers', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true } } });

            server.inject('/headers', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('{\"status\":\"success\"}');
                expect(res.headers.custom1).to.equal('custom header value 1');
                expect(res.headers['x-custom2']).to.equal('custom header value 2');
                done();
            });
        });
    });

    it('overrides upstream cors headers', function (done) {

        var headers = function (request, reply) {

            reply().header('access-control-allow-headers', 'Invalid, List, Of, Values');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: headers });
        upstream.start(function () {

            var server = provisionServer({ routes: { cors: { credentials: true, override: true } } });
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true } } });

            server.inject('/', function (res) {

                expect(res.headers['access-control-allow-headers']).to.equal('Authorization, Content-Type, If-None-Match');
                done();
            });
        });
    });

    it('merges upstream headers', function (done) {

        var headers = function (request, reply) {

            reply({ status: 'success' })
                .vary('X-Custom3');
        };

        var onResponse = function (err, res, request, reply, settings, ttl) {

            reply(res).vary('Something');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/headers', handler: headers });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/headers', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true, onResponse: onResponse } } });

            server.inject({ url: '/headers', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.headers.vary).to.equal('X-Custom3,accept-encoding,Something');
                done();
            });
        });
    });

    it('forwards gzipped content', function (done) {

        var gzipHandler = function (request, reply) {

            reply('123456789012345678901234567890123456789012345678901234567890');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/gzip', handler: gzipHandler });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/gzip', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true } } });

            Zlib.gzip(new Buffer('123456789012345678901234567890123456789012345678901234567890'), function (err, zipped) {

                expect(err).to.not.exist();

                server.inject({ url: '/gzip', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(new Buffer(res.payload, 'binary')).to.deep.equal(zipped);
                    done();
                });
            });
        });
    });

    it('forwards gzipped stream', function (done) {

        var gzipStreamHandler = function (request, reply) {

            reply.file(__dirname + '/../package.json');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/gzipstream', handler: gzipStreamHandler });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/gzipstream', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true } } });

            server.inject({ url: '/gzipstream', headers: { 'accept-encoding': 'gzip' } }, function (res) {

                expect(res.statusCode).to.equal(200);

                Fs.readFile(__dirname + '/../package.json', { encoding: 'utf8' }, function (err, file) {

                    Zlib.unzip(new Buffer(res.payload, 'binary'), function (err, unzipped) {

                        expect(err).to.not.exist();
                        expect(unzipped.toString('utf8')).to.deep.equal(file);
                        done();
                    });
                });
            });
        });
    });

    it('does not forward upstream headers without passThrough', function (done) {

        var headers = function (request, reply) {

            reply({ status: 'success' })
                .header('Custom1', 'custom header value 1')
                .header('X-Custom2', 'custom header value 2')
                .header('access-control-allow-headers', 'Invalid, List, Of, Values');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/noHeaders', handler: headers });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/noHeaders', handler: { proxy: { host: 'localhost', port: upstream.info.port } } });

            server.inject('/noHeaders', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('{\"status\":\"success\"}');
                expect(res.headers.custom1).to.not.exist();
                expect(res.headers['x-custom2']).to.not.exist();
                done();
            });
        });
    });

    it('request a cached proxy route', function (done) {

        var activeCount = 0;
        var activeItem = function (request, reply) {

            reply({
                id: '55cf687663',
                name: 'Active Items',
                count: activeCount++
            });
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/item', handler: activeItem });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/item', handler: { proxy: { host: 'localhost', port: upstream.info.port, protocol: 'http:' } }, config: { cache: { expiresIn: 500 } } });

            server.inject('/item', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.contain('Active Items');
                var counter = res.result.count;

                server.inject('/item', function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.result.count).to.equal(counter);
                    done();
                });
            });
        });
    });

    it('forwards on the status code when making a POST request', function (done) {

        var item = function (request, reply) {

            reply({ id: '55cf687663', name: 'Items' }).created('http://example.com');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'POST', path: '/item', handler: item });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'POST', path: '/item', handler: { proxy: { host: 'localhost', port: upstream.info.port } } });

            server.inject({ url: '/item', method: 'POST' }, function (res) {

                expect(res.statusCode).to.equal(201);
                expect(res.payload).to.contain('Items');
                done();
            });
        });
    });

    it('sends the correct status code when a request is unauthorized', function (done) {

        var unauthorized = function (request, reply) {

            reply(Boom.unauthorized('Not authorized'));
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/unauthorized', handler: unauthorized });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/unauthorized', handler: { proxy: { host: 'localhost', port: upstream.info.port } }, config: { cache: { expiresIn: 500 } } });

            server.inject('/unauthorized', function (res) {

                expect(res.statusCode).to.equal(401);
                done();
            });
        });
    });

    it('sends a 404 status code when a proxied route does not exist', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'POST', path: '/notfound', handler: { proxy: { host: 'localhost', port: upstream.info.port } } });

            server.inject('/notfound', function (res) {

                expect(res.statusCode).to.equal(404);
                done();
            });
        });
    });

    it('overrides status code when a custom onResponse returns an error', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var onResponseWithError = function (err, res, request, reply, settings, ttl) {

                reply(Boom.forbidden('Forbidden'));
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/onResponseError', handler: { proxy: { host: 'localhost', port: upstream.info.port, onResponse: onResponseWithError } } });

            server.inject('/onResponseError', function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });
    });

    it('adds cookie to response', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var on = function (err, res, request, reply, settings, ttl) {

                reply(res).state('a', 'b');
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.info.port, onResponse: on } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(404);
                expect(res.headers['set-cookie'][0]).to.equal('a=b');
                done();
            });
        });
    });

    it('binds onResponse to route bind config', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var onResponseWithError = function (err, res, request, reply, settings, ttl) {

                reply(this.c);
            };

            var handler = {
                proxy: {
                    host: 'localhost',
                    port: upstream.info.port,
                    onResponse: onResponseWithError
                }
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/onResponseError', config: { handler: handler, bind: { c: 6 } } });

            server.inject('/onResponseError', function (res) {

                expect(res.result).to.equal(6);
                done();
            });
        });
    });

    it('binds onResponse to route bind config in plugin', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var server = provisionServer();

            var plugin = function (server, options, next) {

                var onResponseWithError = function (err, res, request, reply, settings, ttl) {

                    reply(this.c);
                };

                var handler = {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        onResponse: onResponseWithError
                    }
                };

                server.route({ method: 'GET', path: '/', config: { handler: handler, bind: { c: 6 } } });
                return next();
            };

            plugin.attributes = {
                name: 'test'
            };

            server.register(plugin, function (err) {

                expect(err).to.not.exist();

                server.inject('/', function (res) {

                    expect(res.result).to.equal(6);
                    done();
                });
            });
        });
    });

    it('binds onResponse to plugin bind', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var server = provisionServer();

            var plugin = function (server, options, next) {

                var onResponseWithError = function (err, res, request, reply, settings, ttl) {

                    reply(this.c);
                };

                var handler = {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        onResponse: onResponseWithError
                    }
                };

                server.bind({ c: 7 });
                server.route({ method: 'GET', path: '/', config: { handler: handler } });
                return next();
            };

            plugin.attributes = {
                name: 'test'
            };

            server.register(plugin, function (err) {

                expect(err).to.not.exist();

                server.inject('/', function (res) {

                    expect(res.result).to.equal(7);
                    done();
                });
            });
        });
    });

    it('binds onResponse to route bind config in plugin when plugin also has bind', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.start(function () {

            var server = provisionServer();

            var plugin = function (server, options, next) {

                var onResponseWithError = function (err, res, request, reply, settings, ttl) {

                    reply(this.c);
                };

                var handler = {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        onResponse: onResponseWithError
                    }
                };

                server.bind({ c: 7 });
                server.route({ method: 'GET', path: '/', config: { handler: handler, bind: { c: 4 } } });
                return next();
            };

            plugin.attributes = {
                name: 'test'
            };

            server.register(plugin, function (err) {

                expect(err).to.not.exist();

                server.inject('/', function (res) {

                    expect(res.result).to.equal(4);
                    done();
                });
            });
        });
    });

    it('calls the onResponse function if the upstream is unreachable', function (done) {

        var dummy = new Hapi.Server();
        dummy.connection();
        dummy.start(function () {

            var dummyPort = dummy.info.port;
            dummy.stop();

            var failureResponse = function (err, res, request, reply, settings, ttl) {

                reply(err);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/failureResponse', handler: { proxy: { host: 'localhost', port: dummyPort, onResponse: failureResponse } }, config: { cache: { expiresIn: 500 } } });

            server.inject('/failureResponse', function (res) {

                expect(res.statusCode).to.equal(502);
                done();
            });
        });
    });

    it('sets x-forwarded-* headers', function (done) {

        var handler = function (request, reply) {

            reply(request.raw.req.headers);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var mapUri = function (request, callback) {

                return callback(null, 'http://127.0.0.1:' + upstream.info.port + '/');
            };

            var server = provisionServer({ host: '127.0.0.1' });
            server.route({ method: 'GET', path: '/', handler: { proxy: { mapUri: mapUri, xforward: true } } });

            server.start(function () {

                Wreck.get('http://127.0.0.1:' + server.info.port + '/', function (err, res, body) {

                    expect(res.statusCode).to.equal(200);
                    var result = JSON.parse(body);

                    var expectedClientAddress = '127.0.0.1';
                    if (Net.isIPv6(server.listener.address().address)) {
                        expectedClientAddress = '::ffff:127.0.0.1';
                    }

                    expect(result['x-forwarded-for']).to.equal(expectedClientAddress);
                    expect(result['x-forwarded-port']).to.match(/\d+/);
                    expect(result['x-forwarded-proto']).to.equal('http');

                    server.stop();
                    upstream.stop();
                    done();
                });
            });
        });
    });

    it('adds x-forwarded-* headers to existing', function (done) {

        var handler = function (request, reply) {

            reply(request.raw.req.headers);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var mapUri = function (request, callback) {

                var headers = {
                    'x-forwarded-for': 'testhost',
                    'x-forwarded-port': 1337,
                    'x-forwarded-proto': 'https'
                };

                return callback(null, 'http://127.0.0.1:' + upstream.info.port + '/', headers);
            };

            var server = provisionServer({ host: '127.0.0.1' });
            server.route({ method: 'GET', path: '/', handler: { proxy: { mapUri: mapUri, xforward: true } } });

            server.start(function () {

                Wreck.get('http://127.0.0.1:' + server.info.port + '/', function (err, res, body) {

                    expect(res.statusCode).to.equal(200);
                    var result = JSON.parse(body);

                    var expectedClientAddress = '127.0.0.1';
                    if (Net.isIPv6(server.listener.address().address)) {
                        expectedClientAddress = '::ffff:127.0.0.1';
                    }

                    expect(result['x-forwarded-for']).to.equal('testhost,' + expectedClientAddress);
                    expect(result['x-forwarded-port']).to.match(/1337\,\d+/);
                    expect(result['x-forwarded-proto']).to.equal('https,http');

                    server.stop();
                    upstream.stop();
                    done();
                });
            });
        });
    });

    it('does not clobber existing x-forwarded-* headers', function (done) {

        var handler = function (request, reply) {

            reply(request.raw.req.headers);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var mapUri = function (request, callback) {

                var headers = {
                    'x-forwarded-for': 'testhost',
                    'x-forwarded-port': 1337,
                    'x-forwarded-proto': 'https'
                };

                return callback(null, 'http://127.0.0.1:' + upstream.info.port + '/', headers);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { mapUri: mapUri, xforward: true } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                var result = JSON.parse(res.payload);
                expect(result['x-forwarded-for']).to.equal('testhost');
                expect(result['x-forwarded-port']).to.equal('1337');
                expect(result['x-forwarded-proto']).to.equal('https');
                done();
            });
        });
    });

    it('forwards on a POST body', function (done) {

        var echoPostBody = function (request, reply) {

            reply(request.payload.echo + request.raw.req.headers['x-super-special']);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'POST', path: '/echo', handler: echoPostBody });
        upstream.start(function () {

            var mapUri = function (request, callback) {

                return callback(null, 'http://127.0.0.1:' + upstream.info.port + request.path + (request.url.search || ''), { 'x-super-special': '@' });
            };

            var server = provisionServer();
            server.route({ method: 'POST', path: '/echo', handler: { proxy: { mapUri: mapUri } } });

            server.inject({ url: '/echo', method: 'POST', payload: '{"echo":true}' }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('true@');
                done();
            });
        });
    });

    it('replies with an error when it occurs in mapUri', function (done) {

        var mapUriWithError = function (request, callback) {

            return callback(new Error('myerror'));
        };

        var server = provisionServer();
        server.route({ method: 'GET', path: '/maperror', handler: { proxy: { mapUri: mapUriWithError } } });

        server.inject('/maperror', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('maxs out redirects to same endpoint', function (done) {

        var redirectHandler = function (request, reply) {

            reply.redirect('/redirect?x=1');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/redirect', handler: redirectHandler });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/redirect', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true, redirects: 2 } } });

            server.inject('/redirect?x=1', function (res) {

                expect(res.statusCode).to.equal(502);
                done();
            });
        });
    });

    it('errors on redirect missing location header', function (done) {

        var redirectHandler = function (request, reply) {

            reply().code(302);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/redirect', handler: redirectHandler });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/redirect', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true, redirects: 2 } } });

            server.inject('/redirect?x=3', function (res) {

                expect(res.statusCode).to.equal(502);
                done();
            });
        });
    });

    it('errors on redirection to bad host', function (done) {

        var server = provisionServer();
        server.route({ method: 'GET', path: '/nowhere', handler: { proxy: { host: 'no.such.domain.x8' } } });

        server.inject('/nowhere', function (res) {

            expect(res.statusCode).to.equal(502);
            done();
        });
    });

    it('errors on redirection to bad host (https)', function (done) {

        var server = provisionServer();
        server.route({ method: 'GET', path: '/nowhere', handler: { proxy: { host: 'no.such.domain.x8', protocol: 'https' } } });

        server.inject('/nowhere', function (res) {

            expect(res.statusCode).to.equal(502);
            done();
        });
    });

    it('redirects to another endpoint', function (done) {

        var redirectHandler = function (request, reply) {

            reply.redirect('/profile');
        };

        var profile = function (request, reply) {

            reply({ id: 'fa0dbda9b1b', name: 'John Doe' }).state('test', '123');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/redirect', handler: redirectHandler });
        upstream.route({ method: 'GET', path: '/profile', handler: profile, config: { cache: { expiresIn: 2000 } } });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/redirect', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true, redirects: 2 } } });
            server.state('auto', { autoValue: 'xyz' });

            server.inject('/redirect', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.contain('John Doe');
                expect(res.headers['set-cookie']).to.deep.equal(['test=123', 'auto=xyz']);
                done();
            });
        });
    });

    it('redirects to another endpoint with relative location', function (done) {

        var redirectHandler = function (request, reply) {

            reply().header('Location', '//localhost:' + request.server.info.port + '/profile').code(302);
        };

        var profile = function (request, reply) {

            reply({ id: 'fa0dbda9b1b', name: 'John Doe' }).state('test', '123');
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/redirect', handler: redirectHandler });
        upstream.route({ method: 'GET', path: '/profile', handler: profile, config: { cache: { expiresIn: 2000 } } });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/redirect', handler: { proxy: { host: 'localhost', port: upstream.info.port, passThrough: true, redirects: 2 } } });
            server.state('auto', { autoValue: 'xyz' });

            server.inject('/redirect?x=2', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.contain('John Doe');
                expect(res.headers['set-cookie']).to.deep.equal(['test=123', 'auto=xyz']);
                done();
            });
        });
    });

    it('redirects to a post endpoint with stream', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'POST',
            path: '/post1',
            handler: function (request, reply) {

                return reply.redirect('/post2').rewritable(false);
            }
        });

        upstream.route({
            method: 'POST',
            path: '/post2',
            handler: function (request, reply) {

                return reply(request.payload);
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'POST', path: '/post1', handler: { proxy: { host: 'localhost', port: upstream.info.port, redirects: 3 } }, config: { payload: { output: 'stream' } } });

            server.inject({ method: 'POST', url: '/post1', payload: 'test', headers: { 'content-type': 'text/plain' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('test');
                done();
            });
        });
    });

    it('errors when proxied request times out', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/timeout1',
            handler: function (request, reply) {

                setTimeout(function () {

                    return reply('Ok');
                }, 10);
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/timeout1', handler: { proxy: { host: 'localhost', port: upstream.info.port, timeout: 5 } } });

            server.inject('/timeout1', function (res) {

                expect(res.statusCode).to.equal(504);
                done();
            });
        });
    });

    it('uses default timeout when nothing is set', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({

            method: 'GET',
            path: '/timeout2',
            handler: function (request, reply) {

                setTimeout(function () {

                    return reply('Ok');
                }, 10);
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/timeout2', handler: { proxy: { host: 'localhost', port: upstream.info.port } } });

            server.inject('/timeout2', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });
    });

    it('uses rejectUnauthorized to allow proxy to self signed ssl server', function (done) {

        var tlsOptions = {
            key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0UqyXDCqWDKpoNQQK/fdr0OkG4gW6DUafxdufH9GmkX/zoKz\ng/SFLrPipzSGINKWtyMvo7mPjXqqVgE10LDI3VFV8IR6fnART+AF8CW5HMBPGt/s\nfQW4W4puvBHkBxWSW1EvbecgNEIS9hTGvHXkFzm4xJ2e9DHp2xoVAjREC73B7JbF\nhc5ZGGchKw+CFmAiNysU0DmBgQcac0eg2pWoT+YGmTeQj6sRXO67n2xy/hA1DuN6\nA4WBK3wM3O4BnTG0dNbWUEbe7yAbV5gEyq57GhJIeYxRvveVDaX90LoAqM4cUH06\n6rciON0UbDHV2LP/JaH5jzBjUyCnKLLo5snlbwIDAQABAoIBAQDJm7YC3pJJUcxb\nc8x8PlHbUkJUjxzZ5MW4Zb71yLkfRYzsxrTcyQA+g+QzA4KtPY8XrZpnkgm51M8e\n+B16AcIMiBxMC6HgCF503i16LyyJiKrrDYfGy2rTK6AOJQHO3TXWJ3eT3BAGpxuS\n12K2Cq6EvQLCy79iJm7Ks+5G6EggMZPfCVdEhffRm2Epl4T7LpIAqWiUDcDfS05n\nNNfAGxxvALPn+D+kzcSF6hpmCVrFVTf9ouhvnr+0DpIIVPwSK/REAF3Ux5SQvFuL\njPmh3bGwfRtcC5d21QNrHdoBVSN2UBLmbHUpBUcOBI8FyivAWJhRfKnhTvXMFG8L\nwaXB51IZAoGBAP/E3uz6zCyN7l2j09wmbyNOi1AKvr1WSmuBJveITouwblnRSdvc\nsYm4YYE0Vb94AG4n7JIfZLKtTN0xvnCo8tYjrdwMJyGfEfMGCQQ9MpOBXAkVVZvP\ne2k4zHNNsfvSc38UNSt7K0HkVuH5BkRBQeskcsyMeu0qK4wQwdtiCoBDAoGBANF7\nFMppYxSW4ir7Jvkh0P8bP/Z7AtaSmkX7iMmUYT+gMFB5EKqFTQjNQgSJxS/uHVDE\nSC5co8WGHnRk7YH2Pp+Ty1fHfXNWyoOOzNEWvg6CFeMHW2o+/qZd4Z5Fep6qCLaa\nFvzWWC2S5YslEaaP8DQ74aAX4o+/TECrxi0z2lllAoGAdRB6qCSyRsI/k4Rkd6Lv\nw00z3lLMsoRIU6QtXaZ5rN335Awyrfr5F3vYxPZbOOOH7uM/GDJeOJmxUJxv+cia\nPQDflpPJZU4VPRJKFjKcb38JzO6C3Gm+po5kpXGuQQA19LgfDeO2DNaiHZOJFrx3\nm1R3Zr/1k491lwokcHETNVkCgYBPLjrZl6Q/8BhlLrG4kbOx+dbfj/euq5NsyHsX\n1uI7bo1Una5TBjfsD8nYdUr3pwWltcui2pl83Ak+7bdo3G8nWnIOJ/WfVzsNJzj7\n/6CvUzR6sBk5u739nJbfgFutBZBtlSkDQPHrqA7j3Ysibl3ZIJlULjMRKrnj6Ans\npCDwkQKBgQCM7gu3p7veYwCZaxqDMz5/GGFUB1My7sK0hcT7/oH61yw3O8pOekee\nuctI1R3NOudn1cs5TAy/aypgLDYTUGQTiBRILeMiZnOrvQQB9cEf7TFgDoRNCcDs\nV/ZWiegVB/WY7H0BkCekuq5bHwjgtJTpvHGqQ9YD7RhE8RSYOhdQ/Q==\n-----END RSA PRIVATE KEY-----\n',
            cert: '-----BEGIN CERTIFICATE-----\nMIIDBjCCAe4CCQDvLNml6smHlTANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJV\nUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTE0MDEyNTIxMjIxOFoXDTE1MDEyNTIxMjIxOFowRTELMAkG\nA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nANFKslwwqlgyqaDUECv33a9DpBuIFug1Gn8Xbnx/RppF/86Cs4P0hS6z4qc0hiDS\nlrcjL6O5j416qlYBNdCwyN1RVfCEen5wEU/gBfAluRzATxrf7H0FuFuKbrwR5AcV\nkltRL23nIDRCEvYUxrx15Bc5uMSdnvQx6dsaFQI0RAu9weyWxYXOWRhnISsPghZg\nIjcrFNA5gYEHGnNHoNqVqE/mBpk3kI+rEVzuu59scv4QNQ7jegOFgSt8DNzuAZ0x\ntHTW1lBG3u8gG1eYBMquexoSSHmMUb73lQ2l/dC6AKjOHFB9Ouq3IjjdFGwx1diz\n/yWh+Y8wY1Mgpyiy6ObJ5W8CAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAoSc6Skb4\ng1e0ZqPKXBV2qbx7hlqIyYpubCl1rDiEdVzqYYZEwmst36fJRRrVaFuAM/1DYAmT\nWMhU+yTfA+vCS4tql9b9zUhPw/IDHpBDWyR01spoZFBF/hE1MGNpCSXXsAbmCiVf\naxrIgR2DNketbDxkQx671KwF1+1JOMo9ffXp+OhuRo5NaGIxhTsZ+f/MA4y084Aj\nDI39av50sTRTWWShlN+J7PtdQVA5SZD97oYbeUeL7gI18kAJww9eUdmT0nEjcwKs\nxsQT1fyKbo7AlZBY4KSlUMuGnn0VnAsB9b+LxtXlDfnjyM8bVQx1uAfRo0DO8p/5\n3J5DTjAU55deBQ==\n-----END CERTIFICATE-----\n'
        };

        var upstream = new Hapi.Server();
        upstream.connection({ tls: tlsOptions });
        upstream.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('Ok');
            }
        });

        upstream.start(function () {

            var mapSslUri = function (request, callback) {

                return callback(null, 'https://127.0.0.1:' + upstream.info.port);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/allow', handler: { proxy: { mapUri: mapSslUri, rejectUnauthorized: false } } });
            server.inject('/allow', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('Ok');
                done();
            });
        });
    });

    it('uses rejectUnauthorized to not allow proxy to self signed ssl server', function (done) {

        var tlsOptions = {
            key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0UqyXDCqWDKpoNQQK/fdr0OkG4gW6DUafxdufH9GmkX/zoKz\ng/SFLrPipzSGINKWtyMvo7mPjXqqVgE10LDI3VFV8IR6fnART+AF8CW5HMBPGt/s\nfQW4W4puvBHkBxWSW1EvbecgNEIS9hTGvHXkFzm4xJ2e9DHp2xoVAjREC73B7JbF\nhc5ZGGchKw+CFmAiNysU0DmBgQcac0eg2pWoT+YGmTeQj6sRXO67n2xy/hA1DuN6\nA4WBK3wM3O4BnTG0dNbWUEbe7yAbV5gEyq57GhJIeYxRvveVDaX90LoAqM4cUH06\n6rciON0UbDHV2LP/JaH5jzBjUyCnKLLo5snlbwIDAQABAoIBAQDJm7YC3pJJUcxb\nc8x8PlHbUkJUjxzZ5MW4Zb71yLkfRYzsxrTcyQA+g+QzA4KtPY8XrZpnkgm51M8e\n+B16AcIMiBxMC6HgCF503i16LyyJiKrrDYfGy2rTK6AOJQHO3TXWJ3eT3BAGpxuS\n12K2Cq6EvQLCy79iJm7Ks+5G6EggMZPfCVdEhffRm2Epl4T7LpIAqWiUDcDfS05n\nNNfAGxxvALPn+D+kzcSF6hpmCVrFVTf9ouhvnr+0DpIIVPwSK/REAF3Ux5SQvFuL\njPmh3bGwfRtcC5d21QNrHdoBVSN2UBLmbHUpBUcOBI8FyivAWJhRfKnhTvXMFG8L\nwaXB51IZAoGBAP/E3uz6zCyN7l2j09wmbyNOi1AKvr1WSmuBJveITouwblnRSdvc\nsYm4YYE0Vb94AG4n7JIfZLKtTN0xvnCo8tYjrdwMJyGfEfMGCQQ9MpOBXAkVVZvP\ne2k4zHNNsfvSc38UNSt7K0HkVuH5BkRBQeskcsyMeu0qK4wQwdtiCoBDAoGBANF7\nFMppYxSW4ir7Jvkh0P8bP/Z7AtaSmkX7iMmUYT+gMFB5EKqFTQjNQgSJxS/uHVDE\nSC5co8WGHnRk7YH2Pp+Ty1fHfXNWyoOOzNEWvg6CFeMHW2o+/qZd4Z5Fep6qCLaa\nFvzWWC2S5YslEaaP8DQ74aAX4o+/TECrxi0z2lllAoGAdRB6qCSyRsI/k4Rkd6Lv\nw00z3lLMsoRIU6QtXaZ5rN335Awyrfr5F3vYxPZbOOOH7uM/GDJeOJmxUJxv+cia\nPQDflpPJZU4VPRJKFjKcb38JzO6C3Gm+po5kpXGuQQA19LgfDeO2DNaiHZOJFrx3\nm1R3Zr/1k491lwokcHETNVkCgYBPLjrZl6Q/8BhlLrG4kbOx+dbfj/euq5NsyHsX\n1uI7bo1Una5TBjfsD8nYdUr3pwWltcui2pl83Ak+7bdo3G8nWnIOJ/WfVzsNJzj7\n/6CvUzR6sBk5u739nJbfgFutBZBtlSkDQPHrqA7j3Ysibl3ZIJlULjMRKrnj6Ans\npCDwkQKBgQCM7gu3p7veYwCZaxqDMz5/GGFUB1My7sK0hcT7/oH61yw3O8pOekee\nuctI1R3NOudn1cs5TAy/aypgLDYTUGQTiBRILeMiZnOrvQQB9cEf7TFgDoRNCcDs\nV/ZWiegVB/WY7H0BkCekuq5bHwjgtJTpvHGqQ9YD7RhE8RSYOhdQ/Q==\n-----END RSA PRIVATE KEY-----\n',
            cert: '-----BEGIN CERTIFICATE-----\nMIIDBjCCAe4CCQDvLNml6smHlTANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJV\nUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTE0MDEyNTIxMjIxOFoXDTE1MDEyNTIxMjIxOFowRTELMAkG\nA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nANFKslwwqlgyqaDUECv33a9DpBuIFug1Gn8Xbnx/RppF/86Cs4P0hS6z4qc0hiDS\nlrcjL6O5j416qlYBNdCwyN1RVfCEen5wEU/gBfAluRzATxrf7H0FuFuKbrwR5AcV\nkltRL23nIDRCEvYUxrx15Bc5uMSdnvQx6dsaFQI0RAu9weyWxYXOWRhnISsPghZg\nIjcrFNA5gYEHGnNHoNqVqE/mBpk3kI+rEVzuu59scv4QNQ7jegOFgSt8DNzuAZ0x\ntHTW1lBG3u8gG1eYBMquexoSSHmMUb73lQ2l/dC6AKjOHFB9Ouq3IjjdFGwx1diz\n/yWh+Y8wY1Mgpyiy6ObJ5W8CAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAoSc6Skb4\ng1e0ZqPKXBV2qbx7hlqIyYpubCl1rDiEdVzqYYZEwmst36fJRRrVaFuAM/1DYAmT\nWMhU+yTfA+vCS4tql9b9zUhPw/IDHpBDWyR01spoZFBF/hE1MGNpCSXXsAbmCiVf\naxrIgR2DNketbDxkQx671KwF1+1JOMo9ffXp+OhuRo5NaGIxhTsZ+f/MA4y084Aj\nDI39av50sTRTWWShlN+J7PtdQVA5SZD97oYbeUeL7gI18kAJww9eUdmT0nEjcwKs\nxsQT1fyKbo7AlZBY4KSlUMuGnn0VnAsB9b+LxtXlDfnjyM8bVQx1uAfRo0DO8p/5\n3J5DTjAU55deBQ==\n-----END CERTIFICATE-----\n'
        };

        var upstream = new Hapi.Server();
        upstream.connection({ tls: tlsOptions });
        upstream.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('Ok');
            }
        });

        upstream.start(function () {

            var mapSslUri = function (request, callback) {

                return callback(null, 'https://127.0.0.1:' + upstream.info.port);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/reject', handler: { proxy: { mapUri: mapSslUri, rejectUnauthorized: true } } });
            server.inject('/reject', function (res) {

                expect(res.statusCode).to.equal(502);
                done();
            });
        });
    });

    it('the default rejectUnauthorized should not allow proxied server cert to be self signed', function (done) {

        var tlsOptions = {
            key: '-----BEGIN RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA0UqyXDCqWDKpoNQQK/fdr0OkG4gW6DUafxdufH9GmkX/zoKz\ng/SFLrPipzSGINKWtyMvo7mPjXqqVgE10LDI3VFV8IR6fnART+AF8CW5HMBPGt/s\nfQW4W4puvBHkBxWSW1EvbecgNEIS9hTGvHXkFzm4xJ2e9DHp2xoVAjREC73B7JbF\nhc5ZGGchKw+CFmAiNysU0DmBgQcac0eg2pWoT+YGmTeQj6sRXO67n2xy/hA1DuN6\nA4WBK3wM3O4BnTG0dNbWUEbe7yAbV5gEyq57GhJIeYxRvveVDaX90LoAqM4cUH06\n6rciON0UbDHV2LP/JaH5jzBjUyCnKLLo5snlbwIDAQABAoIBAQDJm7YC3pJJUcxb\nc8x8PlHbUkJUjxzZ5MW4Zb71yLkfRYzsxrTcyQA+g+QzA4KtPY8XrZpnkgm51M8e\n+B16AcIMiBxMC6HgCF503i16LyyJiKrrDYfGy2rTK6AOJQHO3TXWJ3eT3BAGpxuS\n12K2Cq6EvQLCy79iJm7Ks+5G6EggMZPfCVdEhffRm2Epl4T7LpIAqWiUDcDfS05n\nNNfAGxxvALPn+D+kzcSF6hpmCVrFVTf9ouhvnr+0DpIIVPwSK/REAF3Ux5SQvFuL\njPmh3bGwfRtcC5d21QNrHdoBVSN2UBLmbHUpBUcOBI8FyivAWJhRfKnhTvXMFG8L\nwaXB51IZAoGBAP/E3uz6zCyN7l2j09wmbyNOi1AKvr1WSmuBJveITouwblnRSdvc\nsYm4YYE0Vb94AG4n7JIfZLKtTN0xvnCo8tYjrdwMJyGfEfMGCQQ9MpOBXAkVVZvP\ne2k4zHNNsfvSc38UNSt7K0HkVuH5BkRBQeskcsyMeu0qK4wQwdtiCoBDAoGBANF7\nFMppYxSW4ir7Jvkh0P8bP/Z7AtaSmkX7iMmUYT+gMFB5EKqFTQjNQgSJxS/uHVDE\nSC5co8WGHnRk7YH2Pp+Ty1fHfXNWyoOOzNEWvg6CFeMHW2o+/qZd4Z5Fep6qCLaa\nFvzWWC2S5YslEaaP8DQ74aAX4o+/TECrxi0z2lllAoGAdRB6qCSyRsI/k4Rkd6Lv\nw00z3lLMsoRIU6QtXaZ5rN335Awyrfr5F3vYxPZbOOOH7uM/GDJeOJmxUJxv+cia\nPQDflpPJZU4VPRJKFjKcb38JzO6C3Gm+po5kpXGuQQA19LgfDeO2DNaiHZOJFrx3\nm1R3Zr/1k491lwokcHETNVkCgYBPLjrZl6Q/8BhlLrG4kbOx+dbfj/euq5NsyHsX\n1uI7bo1Una5TBjfsD8nYdUr3pwWltcui2pl83Ak+7bdo3G8nWnIOJ/WfVzsNJzj7\n/6CvUzR6sBk5u739nJbfgFutBZBtlSkDQPHrqA7j3Ysibl3ZIJlULjMRKrnj6Ans\npCDwkQKBgQCM7gu3p7veYwCZaxqDMz5/GGFUB1My7sK0hcT7/oH61yw3O8pOekee\nuctI1R3NOudn1cs5TAy/aypgLDYTUGQTiBRILeMiZnOrvQQB9cEf7TFgDoRNCcDs\nV/ZWiegVB/WY7H0BkCekuq5bHwjgtJTpvHGqQ9YD7RhE8RSYOhdQ/Q==\n-----END RSA PRIVATE KEY-----\n',
            cert: '-----BEGIN CERTIFICATE-----\nMIIDBjCCAe4CCQDvLNml6smHlTANBgkqhkiG9w0BAQUFADBFMQswCQYDVQQGEwJV\nUzETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50ZXJuZXQgV2lkZ2l0\ncyBQdHkgTHRkMB4XDTE0MDEyNTIxMjIxOFoXDTE1MDEyNTIxMjIxOFowRTELMAkG\nA1UEBhMCVVMxEzARBgNVBAgMClNvbWUtU3RhdGUxITAfBgNVBAoMGEludGVybmV0\nIFdpZGdpdHMgUHR5IEx0ZDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEB\nANFKslwwqlgyqaDUECv33a9DpBuIFug1Gn8Xbnx/RppF/86Cs4P0hS6z4qc0hiDS\nlrcjL6O5j416qlYBNdCwyN1RVfCEen5wEU/gBfAluRzATxrf7H0FuFuKbrwR5AcV\nkltRL23nIDRCEvYUxrx15Bc5uMSdnvQx6dsaFQI0RAu9weyWxYXOWRhnISsPghZg\nIjcrFNA5gYEHGnNHoNqVqE/mBpk3kI+rEVzuu59scv4QNQ7jegOFgSt8DNzuAZ0x\ntHTW1lBG3u8gG1eYBMquexoSSHmMUb73lQ2l/dC6AKjOHFB9Ouq3IjjdFGwx1diz\n/yWh+Y8wY1Mgpyiy6ObJ5W8CAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAoSc6Skb4\ng1e0ZqPKXBV2qbx7hlqIyYpubCl1rDiEdVzqYYZEwmst36fJRRrVaFuAM/1DYAmT\nWMhU+yTfA+vCS4tql9b9zUhPw/IDHpBDWyR01spoZFBF/hE1MGNpCSXXsAbmCiVf\naxrIgR2DNketbDxkQx671KwF1+1JOMo9ffXp+OhuRo5NaGIxhTsZ+f/MA4y084Aj\nDI39av50sTRTWWShlN+J7PtdQVA5SZD97oYbeUeL7gI18kAJww9eUdmT0nEjcwKs\nxsQT1fyKbo7AlZBY4KSlUMuGnn0VnAsB9b+LxtXlDfnjyM8bVQx1uAfRo0DO8p/5\n3J5DTjAU55deBQ==\n-----END CERTIFICATE-----\n'
        };

        var upstream = new Hapi.Server();
        upstream.connection({ tls: tlsOptions });
        upstream.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('Ok');
            }
        });

        upstream.start(function () {

            var mapSslUri = function (request, callback) {

                return callback(null, 'https://127.0.0.1:' + upstream.info.port);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/sslDefault', handler: { proxy: { mapUri: mapSslUri } } });
            server.inject('/sslDefault', function (res) {

                expect(res.statusCode).to.equal(502);
                done();
            });
        });
    });

    it('times out when proxy timeout is less than server', { parallel: false }, function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/timeout2',
            handler: function (request, reply) {

                setTimeout(function () {

                    return reply('Ok');
                }, 10);
            }
        });

        upstream.start(function () {

            var server = provisionServer({ routes: { timeout: { server: 8 } } });
            server.route({ method: 'GET', path: '/timeout2', handler: { proxy: { host: 'localhost', port: upstream.info.port, timeout: 2 } } });
            server.inject('/timeout2', function (res) {

                expect(res.statusCode).to.equal(504);
                done();
            });
        });
    });

    it('times out when server timeout is less than proxy', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/timeout1',
            handler: function (request, reply) {

                setTimeout(function () {

                    return reply('Ok');
                }, 10);
            }
        });

        upstream.start(function () {

            var server = provisionServer({ routes: { timeout: { server: 5 } } });
            server.route({ method: 'GET', path: '/timeout1', handler: { proxy: { host: 'localhost', port: upstream.info.port, timeout: 15 } } });
            server.inject('/timeout1', function (res) {

                expect(res.statusCode).to.equal(503);
                done();
            });
        });
    });

    it('proxies via uri template', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/item',
            handler: function (request, reply) {

                return reply({ a: 1 });
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/handlerTemplate', handler: { proxy: { uri: '{protocol}://localhost:' + upstream.info.port + '/item' } } });

            server.inject('/handlerTemplate', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.contain('"a":1');
                done();
            });
        });
    });

    it('passes upstream caching headers', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/cachedItem',
            handler: function (request, reply) {

                return reply({ a: 1 });
            },
            config: {
                cache: {
                    expiresIn: 2000
                }
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/cachedItem', handler: { proxy: { host: 'localhost', port: upstream.info.port, ttl: 'upstream' } } });
            server.state('auto', { autoValue: 'xyz' });

            server.inject('/cachedItem', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.headers['cache-control']).to.equal('max-age=2, must-revalidate, private');
                done();
            });
        });
    });

    it('ignores when no upstream caching headers to pass', function (done) {

        var upstream = Http.createServer(function (req, res) {

            res.end('not much');
        });

        upstream.listen(0, function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.address().port, ttl: 'upstream' } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.headers['cache-control']).to.equal('no-cache');
                done();
            });
        });
    });

    it('ignores when upstream caching header is invalid', function (done) {

        var upstream = Http.createServer(function (req, res) {

            res.writeHeader(200, { 'cache-control': 'some crap that does not work' });
            res.end('not much');
        });

        upstream.listen(0, function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.address().port, ttl: 'upstream' } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.headers['cache-control']).to.equal('no-cache');
                done();
            });
        });
    });

    it('overrides response code with 304', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/item',
            handler: function (request, reply) {

                return reply({ a: 1 });
            }
        });

        upstream.start(function () {

            var onResponse304 = function (err, res, request, reply, settings, ttl) {

                return reply(res).code(304);
            };

            var server = provisionServer();
            server.route({ method: 'GET', path: '/304', handler: { proxy: { uri: 'http://localhost:' + upstream.info.port + '/item', onResponse: onResponse304 } } });

            server.inject('/304', function (res) {

                expect(res.statusCode).to.equal(304);
                expect(res.payload).to.equal('');
                done();
            });
        });
    });

    it('cleans up when proxy response replaced in onPreResponse', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/item',
            handler: function (request, reply) {

                return reply({ a: 1 });
            }
        });

        upstream.start(function () {

            var server = provisionServer();
            server.ext('onPreResponse', function (request, reply) {

                return reply({ something: 'else' });
            });

            server.route({ method: 'GET', path: '/item', handler: { proxy: { host: 'localhost', port: upstream.info.port } } });

            server.inject('/item', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result.something).to.equal('else');
                done();
            });
        });
    });

    it('retails accept-encoding header', function (done) {

        var profile = function (request, reply) {

            reply(request.headers['accept-encoding']);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: profile, config: { cache: { expiresIn: 2000 } } });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.info.port, acceptEncoding: true, passThrough: true } } });

            server.inject({ url: '/', headers: { 'accept-encoding': '*/*' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('*/*');
                done();
            });
        });
    });

    it('removes accept-encoding header', function (done) {

        var profile = function (request, reply) {

            reply(request.headers['accept-encoding']);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: profile, config: { cache: { expiresIn: 2000 } } });
        upstream.start(function () {

            var server = provisionServer();
            server.route({ method: 'GET', path: '/', handler: { proxy: { host: 'localhost', port: upstream.info.port, acceptEncoding: false, passThrough: true } } });

            server.inject({ url: '/', headers: { 'accept-encoding': '*/*' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('');
                done();
            });
        });
    });

    it('does not send multiple Content-Type headers on passthrough', { parallel: false }, function (done) {

        var server = provisionServer();

        var requestFn = Wreck.request;
        Wreck.request = function (method, url, options, cb) {

            Wreck.request = requestFn;
            expect(options.headers['content-type']).to.equal('application/json');
            expect(options.headers['Content-Type']).to.not.exist();
            cb(new Error('placeholder'));
        };
        server.route({ method: 'GET', path: '/test', handler: { proxy: { uri: 'http://localhost', passThrough: true } } });
        server.inject({ method: 'GET', url: '/test', headers: { 'Content-Type': 'application/json' } }, function (res) {

            done();
        });
    });

    it('allows passing in an agent through to Wreck', { parallel: false }, function (done) {

        var server = provisionServer();
        var agent = { name: 'myagent' };

        var requestFn = Wreck.request;
        Wreck.request = function (method, url, options, cb) {

            Wreck.request = requestFn;
            expect(options.agent).to.equal(agent);
            done();

        };
        server.route({ method: 'GET', path: '/agenttest', handler: { proxy: { uri: 'http://localhost', agent: agent } } });
        server.inject({ method: 'GET', url: '/agenttest', headers: {} }, function (res) { });
    });

    it('excludes request cookies defined locally', function (done) {

        var handler = function (request, reply) {

            reply(request.state);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var server = provisionServer();
            server.state('a');

            server.route({
                method: 'GET',
                path: '/',
                handler: {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        passThrough: true
                    }
                }
            });

            server.inject({ url: '/', headers: { cookie: 'a=1;b=2' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                var cookies = JSON.parse(res.payload);
                expect(cookies).to.deep.equal({ b: '2' });
                done();
            });
        });
    });

    it('includes request cookies defined locally (route level)', function (done) {

        var handler = function (request, reply) {

            reply(request.state);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var server = provisionServer();
            server.state('a', { passThrough: true });

            server.route({
                method: 'GET',
                path: '/',
                handler: {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        passThrough: true,
                        localStatePassThrough: true
                    }
                }
            });

            server.inject({ url: '/', headers: { cookie: 'a=1;b=2' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                var cookies = JSON.parse(res.payload);
                expect(cookies).to.deep.equal({ a: '1', b: '2' });
                done();
            });
        });
    });

    it('includes request cookies defined locally (cookie level)', function (done) {

        var handler = function (request, reply) {

            reply(request.state);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var server = provisionServer();
            server.state('a', { passThrough: true });

            server.route({
                method: 'GET',
                path: '/',
                handler: {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        passThrough: true
                    }
                }
            });

            server.inject({ url: '/', headers: { cookie: 'a=1;b=2' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                var cookies = JSON.parse(res.payload);
                expect(cookies).to.deep.equal({ a: '1', b: '2' });
                done();
            });
        });
    });

    it('errors on invalid cookie header', function (done) {

        var server = provisionServer({ routes: { state: { failAction: 'ignore' } } });
        server.state('a', { passThrough: true });

        server.route({
            method: 'GET',
            path: '/',
            handler: {
                proxy: {
                    host: 'localhost',
                    port: 8080,
                    passThrough: true
                }
            }
        });

        server.inject({ url: '/', headers: { cookie: 'a' } }, function (res) {

            expect(res.statusCode).to.equal(400);
            done();
        });
    });

    it('drops cookies when all defined locally', function (done) {

        var handler = function (request, reply) {

            reply(request.state);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var server = provisionServer();
            server.state('a');

            server.route({
                method: 'GET',
                path: '/',
                handler: {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        passThrough: true
                    }
                }
            });

            server.inject({ url: '/', headers: { cookie: 'a=1' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                var cookies = JSON.parse(res.payload);
                expect(cookies).to.deep.equal({});
                done();
            });
        });
    });

    it('excludes request cookies defined locally (state override)', function (done) {

        var handler = function (request, reply) {

            return reply(request.state);
        };

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({ method: 'GET', path: '/', handler: handler });
        upstream.start(function () {

            var server = provisionServer();
            server.state('a', { passThrough: false });

            server.route({
                method: 'GET',
                path: '/',
                handler: {
                    proxy: {
                        host: 'localhost',
                        port: upstream.info.port,
                        passThrough: true
                    }
                }
            });

            server.inject({ url: '/', headers: { cookie: 'a=1;b=2' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                var cookies = JSON.parse(res.payload);
                expect(cookies).to.deep.equal({ b: '2' });
                done();
            });
        });
    });

    it('uses reply decorator', function (done) {

        var upstream = new Hapi.Server();
        upstream.connection();
        upstream.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply('ok');
            }
        });
        upstream.start(function () {

            var server = provisionServer();
            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply.proxy({ host: 'localhost', port: upstream.info.port, xforward: true, passThrough: true });
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.payload).to.equal('ok');
                done();
            });
        });
    });
});
