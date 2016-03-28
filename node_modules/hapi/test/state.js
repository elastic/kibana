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


describe('state', function () {

    it('parses cookies', function (done) {

        var handler = function (request, reply) {

            return reply(request.state);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'v=a' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result.v).to.equal('a');
            done();
        });
    });

    it('skips parsing cookies', function (done) {

        var handler = function (request, reply) {

            return reply(request.state);
        };

        var server = new Hapi.Server();
        server.connection({ routes: { state: { parse: false } } });
        server.route({ method: 'GET', path: '/', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'v=a' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(null);
            done();
        });
    });

    it('does not clear invalid cookie if cannot parse', function (done) {

        var server = new Hapi.Server();
        server.connection();
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'vab', clearInvalid: true } }, function (res) {

            expect(res.statusCode).to.equal(400);
            expect(res.headers['set-cookie']).to.not.exists();
            done();
        });
    });

    it('ignores invalid cookies (state level config)', function (done) {

        var handler = function (request, reply) {

            var log = request.getLog('state');
            return reply(log.length);
        };

        var server = new Hapi.Server();
        server.connection();
        server.state('a', { ignoreErrors: true, encoding: 'base64json' });
        server.route({ path: '/', method: 'GET', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'a=x' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(0);
            done();
        });
    });

    it('ignores invalid cookies (header)', function (done) {

        var handler = function (request, reply) {

            var log = request.getLog('state');
            return reply(log.length);
        };

        var server = new Hapi.Server();
        server.connection({ routes: { state: { failAction: 'ignore' } } });
        server.route({ path: '/', method: 'GET', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'a=x;;' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(0);
            done();
        });
    });

    it('logs invalid cookie (value)', function (done) {

        var handler = function (request, reply) {

            var log = request.getLog('state');
            return reply(log.length);
        };

        var server = new Hapi.Server();
        server.connection({ routes: { state: { failAction: 'log' } } });
        server.state('a', { encoding: 'base64json', clearInvalid: true });
        server.route({ path: '/', method: 'GET', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'a=x' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.result).to.equal(1);
            done();
        });
    });

    it('clears invalid cookies (state level config)', function (done) {

        var handler = function (request, reply) {

            return reply();
        };

        var server = new Hapi.Server();
        server.connection();
        server.state('a', { ignoreErrors: true, encoding: 'base64json', clearInvalid: true });
        server.route({ path: '/', method: 'GET', handler: handler });
        server.inject({ method: 'GET', url: '/', headers: { cookie: 'a=x' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['set-cookie'][0]).to.equal('a=; Max-Age=0; Expires=Thu, 01 Jan 1970 00:00:00 GMT');
            done();
        });
    });

    it('sets cookie value automatically', function (done) {

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.state('always', { autoValue: 'present' });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['set-cookie']).to.deep.equal(['always=present']);
            done();
        });
    });

    it('appends handler set-cookie to server state', function (done) {

        var handler = function (request, reply) {

            return reply().header('set-cookie', ['onecookie=yes', 'twocookie=no']);
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.state('always', { autoValue: 'present' });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['set-cookie']).to.deep.equal(['onecookie=yes', 'twocookie=no', 'always=present']);
            done();
        });
    });

    it('sets cookie value automatically using function', function (done) {

        var present = function (request, next) {

            return next(null, request.params.x);
        };

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/{x}', handler: handler });
        server.state('always', { autoValue: present });

        server.inject('/sweet', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['set-cookie']).to.deep.equal(['always=sweet']);
            done();
        });
    });

    it('fails to set cookie value automatically using function', function (done) {

        var present = function (request, next) {

            return next(new Error());
        };

        var handler = function (request, reply) {

            return reply('ok');
        };

        var server = new Hapi.Server();
        server.connection();
        server.route({ method: 'GET', path: '/', handler: handler });
        server.state('always', { autoValue: present });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            expect(res.headers['set-cookie']).to.not.exist();
            done();
        });
    });

    it('sets cookie value with null ttl', function (done) {

        var handler = function (request, reply) {

            return reply('ok').state('a', 'b');
        };

        var server = new Hapi.Server();
        server.connection();
        server.state('a', { ttl: null });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['set-cookie']).to.deep.equal(['a=b']);
            done();
        });
    });
});
