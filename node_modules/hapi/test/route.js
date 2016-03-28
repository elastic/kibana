// Load modules

var Code = require('code');
var Hapi = require('..');
var Joi = require('joi');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Route', function () {

    it('throws an error when a route is missing a path', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', handler: function () { } });
        }).to.throw('Route missing path');
        done();
    });

    it('throws an error when a route is made without a connection', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.route({ method: 'GET', path: '/dork', handler: function () { } });
        }).to.throw('Cannot add a route without any connections');
        done();
    });

    it('throws an error when a route is missing a method', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.connection();
            server.route({ path: '/', handler: function () { } });
        }).to.throw(/"method" is required/);
        done();
    });

    it('throws an error when a route has a malformed method name', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: '"GET"', path: '/', handler: function () { } });
        }).to.throw(/Invalid method name/);
        done();
    });

    it('throws an error when a route uses the HEAD method', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'HEAD', path: '/', handler: function () { } });
        }).to.throw(/Method name not allowed/);
        done();
    });

    it('throws an error when a route is missing a handler', function (done) {

        expect(function () {

            var server = new Hapi.Server();
            server.connection();
            server.route({ path: '/test', method: 'put' });
        }).to.throw('Missing or undefined handler: put /test');
        done();
    });

    it('throws when handler is missing in config', function (done) {

        var server = new Hapi.Server();
        server.connection();
        expect(function () {

            server.route({ method: 'GET', path: '/', config: {} });
        }).to.throw('Missing or undefined handler: GET /');
        done();
    });

    it('throws when path has trailing slash and server set to strip', function (done) {

        var server = new Hapi.Server();
        server.connection({ router: { stripTrailingSlash: true } });
        expect(function () {

            server.route({ method: 'GET', path: '/test/', handler: function () { } });
        }).to.throw('Path cannot end with a trailing slash when connection configured to strip: GET /test/');
        done();
    });

    it('allows / when path has trailing slash and server set to strip', function (done) {

        var server = new Hapi.Server();
        server.connection({ router: { stripTrailingSlash: true } });
        expect(function () {

            server.route({ method: 'GET', path: '/', handler: function () { } });
        }).to.not.throw();
        done();
    });

    it('sets route plugins and app settings', function (done) {

        var handler = function (request, reply) {

            return reply(request.route.settings.app.x + request.route.settings.plugins.x.y);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', config: { handler: handler, app: { x: 'o' }, plugins: { x: { y: 'k' } } } });
        server.inject('/', function (res) {

            expect(res.result).to.equal('ok');
            done();
        });
    });

    it('throws when validation is set without payload parsing', function (done) {

        var server = new Hapi.Server();
        server.connection();
        expect(function () {

            server.route({ method: 'POST', path: '/', handler: function () { }, config: { validate: { payload: {} }, payload: { parse: false } } });
        }).to.throw('Route payload must be set to \'parse\' when payload validation enabled: POST /');
        done();
    });

    it('throws when validation is set on GET', function (done) {

        var server = new Hapi.Server();
        server.connection();
        expect(function () {

            server.route({ method: 'GET', path: '/', handler: function () { }, config: { validate: { payload: {} } } });
        }).to.throw('Cannot validate HEAD or GET requests: /');
        done();
    });

    it('throws when payload parsing is set on GET', function (done) {

        var server = new Hapi.Server();
        server.connection();
        expect(function () {

            server.route({ method: 'GET', path: '/', handler: function () { }, config: { payload: { parse: true } } });
        }).to.throw('Cannot set payload settings on HEAD or GET request: /');
        done();
    });

    it('ignores validation on * route when request is GET', function (done) {

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: '*', path: '/', handler: handler, config: { validate: { payload: { a: Joi.required() } } } });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('ignores default validation on GET', function (done) {

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection({ routes: { validate: { payload: { a: Joi.required() } } } });
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('shallow copies route config bind', function (done) {

        var server = new Hapi.Server();
        server.connection();
        var context = { key: 'is ' };

        var count = 0;
        Object.defineProperty(context, 'test', {
            enumerable: true,
            configurable: true,
            get: function () {

                ++count;
            }
        });

        var handler = function (request, reply) {

            return reply(this.key + (this === context));
        };

        server.route({ method: 'GET', path: '/', handler: handler, config: { bind: context } });
        server.inject('/', function (res) {

            expect(res.result).to.equal('is true');
            expect(count).to.equal(0);
            done();
        });
    });

    it('shallow copies route config bind (server.bind())', function (done) {

        var server = new Hapi.Server();
        server.connection();
        var context = { key: 'is ' };

        var count = 0;
        Object.defineProperty(context, 'test', {
            enumerable: true,
            configurable: true,
            get: function () {

                ++count;
            }
        });

        var handler = function (request, reply) {

            return reply(this.key + (this === context));
        };

        server.bind(context);
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.result).to.equal('is true');
            expect(count).to.equal(0);
            done();
        });
    });

    it('shallow copies route config bind (connection defaults)', function (done) {

        var server = new Hapi.Server();
        var context = { key: 'is ' };

        var count = 0;
        Object.defineProperty(context, 'test', {
            enumerable: true,
            configurable: true,
            get: function () {

                ++count;
            }
        });

        var handler = function (request, reply) {

            return reply(this.key + (this === context));
        };

        server.connection({ routes: { bind: context } });
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.result).to.equal('is true');
            expect(count).to.equal(0);
            done();
        });
    });

    it('shallow copies route config bind (server defaults)', function (done) {

        var context = { key: 'is ' };

        var count = 0;
        Object.defineProperty(context, 'test', {
            enumerable: true,
            configurable: true,
            get: function () {

                ++count;
            }
        });

        var handler = function (request, reply) {

            return reply(this.key + (this === context));
        };

        var server = new Hapi.Server({ connections: { routes: { bind: context } } });
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject('/', function (res) {

            expect(res.result).to.equal('is true');
            expect(count).to.equal(0);
            done();
        });
    });

    it('overrides server relativeTo', function (done) {

        var server = new Hapi.Server();
        server.connection();
        var handler = function (request, reply) {

            return reply.file('../package.json');
        };

        server.route({ method: 'GET', path: '/file', handler: handler, config: { files: { relativeTo: __dirname } } });

        server.inject('/file', function (res) {

            expect(res.payload).to.contain('hapi');
            done();
        });
    });

    it('throws when server timeout is more then socket timeout', function (done) {

        var server = new Hapi.Server();
        expect(function () {

            server.connection({ routes: { timeout: { server: 60000, socket: 12000 } } });
        }).to.throw('Server timeout must be shorter than socket timeout: /{p*}');
        done();
    });

    it('throws when server timeout is more then socket timeout (node default)', function (done) {

        var server = new Hapi.Server();
        expect(function () {

            server.connection({ routes: { timeout: { server: 6000000 } } });
        }).to.throw('Server timeout must be shorter than socket timeout: /{p*}');
        done();
    });

    it('ignores large server timeout when socket timeout disabled', function (done) {

        var server = new Hapi.Server();
        expect(function () {

            server.connection({ routes: { timeout: { server: 6000000, socket: false } } });
        }).to.not.throw();
        done();
    });

    it('overrides qs settings', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.route({
            method: 'POST',
            path: '/',
            config: {
                payload: {
                    qs: {
                        parseArrays: false
                    }
                },
                handler: function (request, reply) {

                    return reply(request.payload);
                }
            }
        });

        server.inject({ method: 'POST', url: '/', payload: 'a[0]=b&a[1]=c', headers: { 'content-type': 'application/x-www-form-urlencoded' } }, function (res) {

            expect(res.result).to.deep.equal({ a: { 0: 'b', 1: 'c' } });
            done();
        });
    });
});
