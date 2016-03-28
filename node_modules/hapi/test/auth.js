// Load modules

var Path = require('path');
var Boom = require('boom');
var Code = require('code');
var Handlebars = require('handlebars');
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


describe('authentication', function () {

    it('requires and authenticates a request', function (done) {

        var handler = function (request, reply) {

            return reply(request.auth.credentials.user);
        };

        var server = new Hapi.Server();
        server.connection();
        server.auth.scheme('custom', internals.implementation);
        server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject('/', function (res1) {

            expect(res1.statusCode).to.equal(401);

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                expect(res2.statusCode).to.equal(200);
                done();
            });
        });
    });

    it('defaults cache to private if request authenticated', function (done) {

        var handler = function (request, reply) {

            return reply('ok').ttl(1000);
        };

        var server = new Hapi.Server();
        server.connection();
        server.auth.scheme('custom', internals.implementation);
        server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
        server.route({ method: 'GET', path: '/', handler: handler });

        server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

            expect(res.statusCode).to.equal(200);
            expect(res.headers['cache-control']).to.equal('max-age=1, must-revalidate, private');
            done();
        });
    });

    describe('strategy()', function () {

        it('fails when options default to null', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true);
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('throws when strategy missing scheme', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.auth.strategy('none');
            }).to.throw('Authentication strategy none missing scheme');
            done();
        });

        it('adds a route to server', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} }, route: true });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(401);

                server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    done();
                });
            });
        });

        it('uses views', function (done) {

            var implementation = function (server, options) {

                server.views({
                    engines: { 'html': Handlebars },
                    relativeTo: Path.join(__dirname, '/templates/plugin')
                });

                var handler = function (request, reply) {

                    return reply.view('test', { message: 'steve' });
                };

                server.route({ method: 'GET', path: '/view', handler: handler, config: { auth: false } });

                return {
                    authenticate: function (request, reply) {

                        return reply.view('test', { message: 'xyz' });
                    }
                };
            };

            var server = new Hapi.Server();
            server.connection();

            server.views({
                engines: { 'html': Handlebars },
                relativeTo: Path.join(__dirname, '/no/such/directory')
            });

            server.auth.scheme('custom', implementation);
            server.auth.strategy('default', 'custom', true);

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply();
                }
            });

            server.inject('/view', function (res1) {

                expect(res1.result).to.equal('<h1>steve</h1>');

                server.inject('/', function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result).to.equal('<h1>xyz</h1>');
                    done();
                });
            });
        });
    });

    describe('default()', function () {

        it('sets default', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });

            server.auth.default('default');
            expect(server.connections[0].auth.settings.default).to.deep.equal({ strategies: ['default'], mode: 'required' });

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(401);

                server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    done();
                });
            });
        });

        it('sets default with object', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });
            server.auth.default({ strategy: 'default' });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(401);

                server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    done();
                });
            });
        });

        it('throws when setting default twice', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });
            expect(function () {

                server.auth.default('default');
                server.auth.default('default');
            }).to.throw('Cannot set default strategy more than once');
            done();
        });

        it('throws when setting default without strategy', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });
            expect(function () {

                server.auth.default({ mode: 'required' });
            }).to.throw('Default authentication strategy missing strategy name');
            done();
        });
    });

    describe('_setupRoute()', function () {

        it('throws when route refers to nonexistent strategy', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('a', 'custom', { users: { steve: {} } });
            server.auth.strategy('b', 'custom', { users: { steve: {} } });

            expect(function () {

                server.route({
                    path: '/',
                    method: 'GET',
                    config: {
                        auth: {
                            strategy: 'c'
                        },
                        handler: function (request, reply) {

                            return reply('ok');
                        }
                    }
                });
            }).to.throw('Unknown authentication strategy: c in path: /');

            done();
        });
    });

    describe('authenticate()', function () {

        it('setups route with optional authentication', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });

            var handler = function (request, reply) {

                return reply(!!request.auth.credentials);
            };
            server.route({ method: 'GET', path: '/', config: { handler: handler, auth: { mode: 'optional' } } });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(200);
                expect(res1.payload).to.equal('false');

                server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.payload).to.equal('true');
                    done();
                });
            });
        });

        it('exposes mode', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply(request.auth.mode);
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('required');
                done();
            });
        });

        it('authenticates using multiple strategies', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('first', 'custom', { users: { steve: 'skip' } });
            server.auth.strategy('second', 'custom', { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.strategy);
                    },
                    auth: {
                        strategies: ['first', 'second']
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('second');
                done();
            });
        });

        it('authenticates using credentials object', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });

            var doubleHandler = function (request, reply) {

                var options = { url: '/2', credentials: request.auth.credentials };
                server.inject(options, function (res) {

                    return reply(res.result);
                });
            };

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            server.route({ method: 'GET', path: '/1', handler: doubleHandler });
            server.route({ method: 'GET', path: '/2', handler: handler });

            server.inject({ url: '/1', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('authenticates a request with custom auth settings', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        strategy: 'default'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('authenticates a request with auth strategy name config', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: 'default'
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('tries to authenticate a request', function (done) {

            var handler = function (request, reply) {

                return reply({ status: request.auth.isAuthenticated, error: request.auth.error });
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', 'try', { users: { steve: {} } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(200);
                expect(res1.result.status).to.equal(false);
                expect(res1.result.error.message).to.equal('Missing authentication');

                server.inject({ url: '/', headers: { authorization: 'Custom john' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result.status).to.equal(false);
                    expect(res2.result.error.message).to.equal('Missing credentials');

                    server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res3) {

                        expect(res3.statusCode).to.equal(200);
                        expect(res3.result.status).to.equal(true);
                        expect(res3.result.error).to.not.exist();
                        done();
                    });
                });
            });
        });

        it('errors on invalid authenticate callback missing both error and credentials', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom' } }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('logs error', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.on('request-internal', function (request, event, tags) {

                if (tags.auth) {
                    done();
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom john' } }, function (res) {

                expect(res.statusCode).to.equal(401);
            });
        });

        it('returns a non Error error response', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { message: 'in a bottle' } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom message' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('in a bottle');
                done();
            });
        });

        it('handles errors thrown inside authenticate', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: 'throw' } });

            server.once('request-error', function (request, err) {

                expect(err.message).to.equal('Uncaught error: Boom');
            });

            var handler = function (request, reply) {

                return reply('ok');
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('passes non Error error response when set to try ', function (done) {

            var handler = function (request, reply) {

                return reply('ok');
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', 'try', { users: { message: 'in a bottle' } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom message' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('in a bottle');
                done();
            });
        });

        it('matches scope (array to single)', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: ['one'] } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: 'one'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches scope (array to array)', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: ['one', 'two'] } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: ['one', 'three']
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches scope (single to array)', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one' } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: ['one', 'three']
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches scope (single to single)', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one' } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: 'one'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches dynamic scope (single to single)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one-test' } } });
            server.route({
                method: 'GET',
                path: '/{id}',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        scope: 'one-{params.id}'
                    }
                }
            });

            server.inject({ url: '/test', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches dynamic scope with multiple parts (single to single)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one-test-admin' } } });
            server.route({
                method: 'GET',
                path: '/{id}/{role}',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        scope: 'one-{params.id}-{params.role}'
                    }
                }
            });

            server.inject({ url: '/test/admin', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('does not match broken dynamic scope (single to single)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one-test' } } });
            server.route({
                method: 'GET',
                path: '/{id}',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        scope: 'one-params.id}'
                    }
                }
            });

            server.inject({ url: '/test', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('does not match scope (single to single)', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: 'one' } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: 'onex'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('errors on missing scope', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: ['a'] } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: 'b'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('errors on missing scope property', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: 'b'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('errors on missing scope using arrays', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { scope: ['a', 'b'] } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: handler,
                    auth: {
                        scope: ['c', 'd']
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('ignores default scope when override set to null', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: {} } });
            server.auth.default({
                strategy: 'default',
                scope: 'one'
            });

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        scope: false
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('matches user entity', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { user: 'steve' } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        entity: 'user'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('errors on missing user entity', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { client: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        entity: 'user'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom client' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('matches app entity', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { client: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        entity: 'app'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom client' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('errors on missing app entity', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { user: 'steve' } } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        entity: 'app'
                    }
                }
            });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('logs error code when authenticate returns a non-error error', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('test', function (srv, options) {

                return {
                    authenticate: function (request, reply) {

                        return reply('Redirecting ...').redirect('/test');
                    }
                };
            });

            server.auth.strategy('test', 'test', true, {});

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply('test');
                }
            });

            var result;
            server.on('request-internal', function (request, event, tags) {

                if (tags.unauthenticated) {
                    result = event.data;
                }
            });

            server.inject('/', function (res) {

                expect(result).to.equal(302);
                done();
            });
        });

        it('passes the options.artifacts object, even with an auth filter', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: {} } });
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.artifacts);
                    },
                    auth: 'default'
                }
            });

            var options = {
                url: '/',
                headers: { authorization: 'Custom steve' },
                credentials: { foo: 'bar' },
                artifacts: { bar: 'baz' }
            };

            server.inject(options, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result.bar).to.equal('baz');
                done();
            });



        });

    });

    describe('payload()', function () {

        it('authenticates request payload', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { validPayload: { payload: null } } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: 'required'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom validPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('skips when scheme does not support it', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { validPayload: { payload: null } }, payload: false });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom validPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('authenticates request payload (required scheme)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { validPayload: { payload: null } }, options: { payload: true } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {}
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom validPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('authenticates request payload (required scheme and required route)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { validPayload: { payload: null } }, options: { payload: true } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: true
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom validPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('throws when scheme requires payload authentication and route conflicts', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { validPayload: { payload: null } }, options: { payload: true } });
            expect(function () {

                server.route({
                    method: 'POST',
                    path: '/',
                    config: {
                        handler: function (request, reply) {

                            return reply(request.auth.credentials.user);
                        },
                        auth: {
                            payload: 'optional'
                        }
                    }
                });
            }).to.throw('Cannot set authentication payload to optional when a strategy requires payload validation /');
            done();
        });

        it('throws when strategy does not support payload authentication', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var implementation = function () {

                return { authenticate: internals.implementation().authenticate };
            };

            server.auth.scheme('custom', implementation);
            server.auth.strategy('default', 'custom', true, {});
            expect(function () {

                server.route({
                    method: 'POST',
                    path: '/',
                    config: {
                        handler: function (request, reply) {

                            return reply(request.auth.credentials.user);
                        },
                        auth: {
                            payload: 'required'
                        }
                    }
                });
            }).to.throw('Payload validation can only be required when all strategies support it in path: /');
            done();
        });

        it('throws when no strategy supports optional payload authentication', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var implementation = function () {

                return { authenticate: internals.implementation().authenticate };
            };

            server.auth.scheme('custom', implementation);
            server.auth.strategy('default', 'custom', true, {});
            expect(function () {

                server.route({
                    method: 'POST',
                    path: '/',
                    config: {
                        handler: function (request, reply) {

                            return reply(request.auth.credentials.user);
                        },
                        auth: {
                            payload: 'optional'
                        }
                    }
                });
            }).to.throw('Payload authentication requires at least one strategy with payload support in path: /');
            done();
        });

        it('allows one strategy to supports optional payload authentication while another does not', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var implementation = function () {

                return { authenticate: internals.implementation().authenticate };
            };

            server.auth.scheme('custom1', implementation);
            server.auth.scheme('custom2', internals.implementation);
            server.auth.strategy('default1', 'custom1', {});
            server.auth.strategy('default2', 'custom2', {});
            expect(function () {

                server.route({
                    method: 'POST',
                    path: '/',
                    config: {
                        handler: function (request, reply) {

                            return reply(request.auth.credentials.user);
                        },
                        auth: {
                            strategies: ['default2', 'default1'],
                            payload: 'optional'
                        }
                    }
                });
            }).to.not.throw();
            done();
        });

        it('skips request payload by default', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { skip: {} } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom skip' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('skips request payload when unauthenticated', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { skip: {} } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    auth: {
                        mode: 'try',
                        payload: 'required'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/' }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('skips optional payload', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { optionalPayload: { payload: Boom.unauthorized(null, 'Custom') } } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: 'optional'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom optionalPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('errors on missing payload when required', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { optionalPayload: { payload: Boom.unauthorized(null, 'Custom') } } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: 'required'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom optionalPayload' } }, function (res) {

                expect(res.statusCode).to.equal(401);
                done();
            });
        });

        it('errors on invalid payload auth when required', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { optionalPayload: { payload: Boom.unauthorized() } } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: 'required'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom optionalPayload' } }, function (res) {

                expect(res.statusCode).to.equal(401);
                done();
            });
        });

        it('errors on invalid request payload (non error)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { invalidPayload: { payload: 'Payload is invalid' } } });
            server.route({
                method: 'POST',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(request.auth.credentials.user);
                    },
                    auth: {
                        payload: 'required'
                    }
                }
            });

            server.inject({ method: 'POST', url: '/', headers: { authorization: 'Custom invalidPayload' } }, function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('Payload is invalid');
                done();
            });
        });
    });

    describe('response()', function () {

        it('fails on response error', function (done) {

            var handler = function (request, reply) {

                return reply(request.auth.credentials.user);
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', true, { users: { steve: { response: Boom.internal() } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('test()', function () {

        it('tests a request', function (done) {

            var handler = function (request, reply) {

                request.server.auth.test('default', request, function (err, credentials) {

                    if (err) {
                        return reply({ status: false });
                    }

                    return reply({ status: true, user: credentials.name });
                });
            };

            var server = new Hapi.Server();
            server.connection();
            server.auth.scheme('custom', internals.implementation);
            server.auth.strategy('default', 'custom', { users: { steve: { name: 'steve' } } });
            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res1) {

                expect(res1.statusCode).to.equal(200);
                expect(res1.result.status).to.equal(false);

                server.inject({ url: '/', headers: { authorization: 'Custom steve' } }, function (res2) {

                    expect(res2.statusCode).to.equal(200);
                    expect(res2.result.status).to.equal(true);
                    expect(res2.result.user).to.equal('steve');
                    done();
                });
            });
        });
    });
});


internals.implementation = function (server, options) {

    var settings = Hoek.clone(options);

    if (settings &&
        settings.route) {

        server.route({
            method: 'GET',
            path: '/',
            handler: function (request, reply) {

                return reply(request.auth.credentials.user);
            }
        });
    }

    var scheme = {
        authenticate: function (request, reply) {

            var req = request.raw.req;
            var authorization = req.headers.authorization;
            if (!authorization) {
                return reply(Boom.unauthorized(null, 'Custom'));
            }

            var parts = authorization.split(/\s+/);
            if (parts.length !== 2) {
                return reply.continue();        // Error without error or credentials
            }

            var username = parts[1];
            var credentials = settings.users[username];

            if (!credentials) {
                return reply(Boom.unauthorized('Missing credentials', 'Custom'));
            }

            if (credentials === 'skip') {
                return reply(Boom.unauthorized(null, 'Custom'));
            }

            if (credentials === 'throw') {
                throw new Error('Boom');
            }

            if (typeof credentials === 'string') {
                return reply(credentials);
            }

            return reply.continue({ credentials: credentials });
        },
        response: function (request, reply) {

            if (request.auth.credentials.response) {
                return reply(request.auth.credentials.response);
            }

            return reply.continue();
        }
    };

    if (!settings ||
        settings.payload !== false) {

        scheme.payload = function (request, reply) {

            if (request.auth.credentials.payload) {
                return reply(request.auth.credentials.payload);
            }

            return reply.continue();
        };
    }

    if (settings &&
        settings.options) {

        scheme.options = settings.options;
    }

    return scheme;
};
