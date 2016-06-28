// Load modules

var Path = require('path');
var Boom = require('boom');
var Code = require('code');
var Handlebars = require('handlebars');
var Hapi = require('..');
var Lab = require('lab');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('handler', function () {

    describe('execute()', function () {

        it('returns 500 on handler exception (same tick)', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var handler = function (request) {

                var x = a.b.c;
            };

            server.route({ method: 'GET', path: '/domain', handler: handler });

            server.inject('/domain', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns 500 on handler exception (next tick)', { parallel: false }, function (done) {

            var handler = function (request) {

                setImmediate(function () {

                    var x = not.here;
                });
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({ method: 'GET', path: '/', handler: handler });
            server.on('request-error', function (request, err) {

                expect(err.message).to.equal('Uncaught error: not is not defined');
                done();
            });

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('internal, implementation, error');
            };

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
            });
        });
    });

    describe('handler()', function () {

        it('binds handler to route bind object', function (done) {

            var item = { x: 123 };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(this.x);
                    },
                    bind: item
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal(item.x);
                done();
            });
        });

        it('invokes handler with right arguments', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var handler = function (request, reply) {

                expect(arguments.length).to.equal(2);
                expect(reply.send).to.not.exist();
                return reply('ok');
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.equal('ok');
                done();
            });
        });
    });

    describe('register()', function () {

        it('proxies from handler', function (done) {

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

                var handler = function (request, reply) {

                    return reply.proxy({ uri: 'http://localhost:' + upstream.info.port + '/item' });
                };

                var server = new Hapi.Server();
                server.connection();
                server.route({ method: 'GET', path: '/handler', handler: handler });

                server.inject('/handler', function (res) {

                    expect(res.statusCode).to.equal(200);
                    expect(res.payload).to.contain('"a":1');
                    done();
                });
            });
        });

        it('returns a file', function (done) {

            var server = new Hapi.Server();
            server.connection({ routes: { files: { relativeTo: __dirname } } });
            var handler = function (request, reply) {

                return reply.file('../package.json').code(499);
            };

            server.route({ method: 'GET', path: '/file', handler: handler });

            server.inject('/file', function (res) {

                expect(res.statusCode).to.equal(499);
                expect(res.payload).to.contain('hapi');
                expect(res.headers['content-type']).to.equal('application/json; charset=utf-8');
                expect(res.headers['content-length']).to.exist();
                expect(res.headers['content-disposition']).to.not.exist();
                done();
            });
        });

        it('returns a view', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.views({
                engines: { 'html': Handlebars },
                relativeTo: Path.join(__dirname, '/templates/plugin')
            });

            var handler = function (request, reply) {

                return reply.view('test', { message: 'steve' });
            };

            server.route({ method: 'GET', path: '/', handler: handler });

            server.inject('/', function (res) {

                expect(res.result).to.equal('<h1>steve</h1>');
                done();
            });
        });
    });

    describe('prerequisites()', function () {

        it('shows the complete prerequisite pipeline in the response', function (done) {

            var pre1 = function (request, reply) {

                return reply('Hello').code(444);
            };

            var pre2 = function (request, reply) {

                return reply(request.pre.m1 + request.pre.m3 + request.pre.m4);
            };

            var pre3 = function (request, reply) {

                process.nextTick(function () {

                    return reply(' ');
                });
            };

            var pre4 = function (request, reply) {

                return reply('World');
            };

            var pre5 = function (request, reply) {

                return reply(request.pre.m2 + '!');
            };

            var handler = function (request, reply) {

                return reply(request.pre.m5);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        [
                            { method: pre1, assign: 'm1' },
                            { method: pre3, assign: 'm3' },
                            { method: pre4, assign: 'm4' }
                        ],
                        { method: pre2, assign: 'm2' },
                        { method: pre5, assign: 'm5' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal('Hello World!');
                done();
            });
        });

        it('allows a single prerequisite', function (done) {

            var pre = function (request, reply) {

                return reply('Hello');
            };

            var handler = function (request, reply) {

                return reply(request.pre.p);
            };

            var server = new Hapi.Server();
            server.connection();

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        { method: pre, assign: 'p' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal('Hello');
                done();
            });
        });

        it('allows an empty prerequisite array', function (done) {

            var handler = function (request, reply) {

                return reply('Hello');
            };

            var server = new Hapi.Server();
            server.connection();

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal('Hello');
                done();
            });
        });

        it('takes over response', function (done) {

            var pre1 = function (request, reply) {

                return reply('Hello');
            };

            var pre2 = function (request, reply) {

                return reply(request.pre.m1 + request.pre.m3 + request.pre.m4);
            };

            var pre3 = function (request, reply) {

                process.nextTick(function () {

                    return reply(' ').takeover();
                });
            };

            var pre4 = function (request, reply) {

                return reply('World');
            };

            var pre5 = function (request, reply) {

                return reply(request.pre.m2 + '!');
            };

            var handler = function (request, reply) {

                return reply(request.pre.m5);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        [
                            { method: pre1, assign: 'm1' },
                            { method: pre3, assign: 'm3' },
                            { method: pre4, assign: 'm4' }
                        ],
                        { method: pre2, assign: 'm2' },
                        { method: pre5, assign: 'm5' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal(' ');
                done();
            });
        });

        it('returns error if prerequisite returns error', function (done) {

            var pre1 = function (request, reply) {

                return reply('Hello');
            };

            var pre2 = function (request, reply) {

                return reply(Boom.internal('boom'));
            };

            var handler = function (request, reply) {

                return reply(request.pre.m1);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        [{ method: pre1, assign: 'm1' }],
                        { method: pre2, assign: 'm2' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result.statusCode).to.equal(500);
                done();
            });
        });

        it('passes wrapped object', function (done) {

            var pre = function (request, reply) {

                return reply('Hello').code(444);
            };

            var handler = function (request, reply) {

                return reply(request.preResponses.p);
            };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        { method: pre, assign: 'p' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(444);
                done();
            });
        });

        it('returns 500 if prerequisite throws', function (done) {

            var pre1 = function (request, reply) {

                return reply('Hello');
            };

            var pre2 = function (request, reply) {

                a.b.c = 0;
            };

            var handler = function (request, reply) {

                return reply(request.pre.m1);
            };


            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        [{ method: pre1, assign: 'm1' }],
                        { method: pre2, assign: 'm2' }
                    ],
                    handler: handler
                }
            });

            server.inject('/', function (res) {

                expect(res.result.statusCode).to.equal(500);
                done();
            });
        });

        it('returns a user record using server method', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user(params.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
                done();
            });
        });

        it('returns a user record using server method in object', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        {
                            method: 'user(params.id)',
                            assign: 'steve'
                        }
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.steve);
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
                done();
            });
        });

        it('returns a user name using multiple server methods', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            });

            server.method('name', function (user, next) {

                return next(null, user.name);
            });

            server.route({
                method: 'GET',
                path: '/user/{id}/name',
                config: {
                    pre: [
                        'user(params.id)',
                        'name(pre.user)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.name);
                    }
                }
            });

            server.inject('/user/5/name', function (res) {

                expect(res.result).to.equal('Bob');
                done();
            });
        });

        it('returns a user record using server method with trailing space', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user(params.id )'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
                done();
            });
        });

        it('returns a user record using server method with leading space', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user( params.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
                done();
            });
        });

        it('returns a user record using server method with zero args', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (next) {

                return next(null, { name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user',
                config: {
                    pre: [
                        'user()'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });

            server.inject('/user', function (res) {

                expect(res.result).to.deep.equal({ name: 'Bob' });
                done();
            });
        });

        it('returns a user record using server method with no args', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (request, next) {

                return next(null, { id: request.params.id, name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user);
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result).to.deep.equal({ id: '5', name: 'Bob' });
                done();
            });
        });

        it('returns a user record using server method with nested name', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user.get', function (next) {

                return next(null, { name: 'Bob' });
            });

            server.route({
                method: 'GET',
                path: '/user',
                config: {
                    pre: [
                        'user.get()'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre['user.get']);
                    }
                }
            });

            server.inject('/user', function (res) {

                expect(res.result).to.deep.equal({ name: 'Bob' });
                done();
            });
        });

        it('fails on bad method name', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var test = function () {

                server.route({
                    method: 'GET',
                    path: '/x/{id}',
                    config: {
                        pre: [
                            'xuser(params.id)'
                        ],
                        handler: function (request, reply) {

                            return reply(request.pre.user);
                        }
                    }
                });
            };

            expect(test).to.throw('Unknown server method in string notation: xuser(params.id)');
            done();
        });

        it('fails on bad method syntax name', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var test = function () {

                server.route({
                    method: 'GET',
                    path: '/x/{id}',
                    config: {
                        pre: [
                            'userparams.id)'
                        ],
                        handler: function (request, reply) {

                            return reply(request.pre.user);
                        }
                    }
                });
            };

            expect(test).to.throw('Invalid server method string notation: userparams.id)');
            done();
        });

        it('sets pre failAction to error', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        {
                            method: function (request, reply) {

                                return reply(Boom.forbidden());
                            },
                            failAction: 'error'
                        }
                    ],
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(403);
                done();
            });
        });

        it('sets pre failAction to ignore', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        {
                            method: function (request, reply) {

                                return reply(Boom.forbidden());
                            },
                            failAction: 'ignore'
                        }
                    ],
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('sets pre failAction to log', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [
                        {
                            assign: 'before',
                            method: function (request, reply) {

                                return reply(Boom.forbidden());
                            },
                            failAction: 'log'
                        }
                    ],
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                }
            });

            var log = null;
            server.on('request-internal', function (request, event, tags) {

                if (event.internal &&
                    tags.pre &&
                    tags.error) {

                    log = event.data.assign;
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(log).to.equal('before');
                done();
            });
        });

        it('binds pre to route bind object', function (done) {

            var item = { x: 123 };

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    pre: [{
                        method: function (request, reply) {

                            return reply(this.x);
                        }, assign: 'x'
                    }],
                    handler: function (request, reply) {

                        return reply(request.pre.x);
                    },
                    bind: item
                }
            });

            server.inject('/', function (res) {

                expect(res.result).to.equal(item.x);
                done();
            });
        });

        it('logs boom error instance as data if handler returns boom error', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply(Boom.forbidden());
                    }
                }
            });

            var log = null;
            server.on('request-internal', function (request, event, tags) {

                if (event.internal &&
                    tags.handler &&
                    tags.error) {

                    log = event.data;
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(403);
                expect(log.data.isBoom).to.equal(true);
                expect(log.data.output.statusCode).to.equal(403);
                expect(log.data.message).to.equal('Forbidden');
                done();
            });
        });

        it('logs server method using string notation when cache enabled', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob' });
            }, { cache: { expiresIn: 1000 } });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user(params.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.getLog('method'));
                    }
                }
            });

            server.inject('/user/5', function (res) {

                expect(res.result[0].tags).to.deep.equal(['pre', 'method', 'user']);
                expect(res.result[0].internal).to.equal(true);
                expect(res.result[0].data.msec).to.exist();
                done();
            });
        });

        it('uses server method with cache via string notation', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var gen = 0;
            server.method('user', function (id, next) {

                return next(null, { id: id, name: 'Bob', gen: gen++ });
            }, { cache: { expiresIn: 1000 } });

            server.route({
                method: 'GET',
                path: '/user/{id}',
                config: {
                    pre: [
                        'user(params.id)'
                    ],
                    handler: function (request, reply) {

                        return reply(request.pre.user.gen);
                    }
                }
            });

            server.start(function () {

                server.inject('/user/5', function (res1) {

                    expect(res1.result).to.equal(0);

                    server.inject('/user/5', function (res2) {

                        expect(res2.result).to.equal(0);
                        done();
                    });
                });
            });
        });
    });

    describe('fromString()', function () {

        it('uses string handler', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.method('handler.get', function (request, reply) {

                return reply(null, request.params.x + request.params.y).code(299);
            });

            server.route({ method: 'GET', path: '/{x}/{y}', handler: 'handler.get' });
            server.inject('/a/b', function (res) {

                expect(res.statusCode).to.equal(299);
                expect(res.result).to.equal('ab');
                done();
            });
        });
    });

    describe('defaults()', function () {

        it('returns handler without defaults', function (done) {

            var handler = function (route, options) {

                return function (request, reply) {

                    return reply(request.route.settings.app);
                };
            };

            var server = new Hapi.Server();
            server.connection();
            server.handler('test', handler);
            server.route({ method: 'get', path: '/', handler: { test: 'value' } });
            server.inject('/', function (res) {

                expect(res.result).to.deep.equal({});
                done();
            });
        });

        it('returns handler with object defaults', function (done) {

            var handler = function (route, options) {

                return function (request, reply) {

                    return reply(request.route.settings.app);
                };
            };

            handler.defaults = {
                app: {
                    x: 1
                }
            };

            var server = new Hapi.Server();
            server.connection();
            server.handler('test', handler);
            server.route({ method: 'get', path: '/', handler: { test: 'value' } });
            server.inject('/', function (res) {

                expect(res.result).to.deep.equal({ x: 1 });
                done();
            });
        });

        it('returns handler with function defaults', function (done) {

            var handler = function (route, options) {

                return function (request, reply) {

                    return reply(request.route.settings.app);
                };
            };

            handler.defaults = function (method) {

                return {
                    app: {
                        x: method
                    }
                };
            };

            var server = new Hapi.Server();
            server.connection();
            server.handler('test', handler);
            server.route({ method: 'get', path: '/', handler: { test: 'value' } });
            server.inject('/', function (res) {

                expect(res.result).to.deep.equal({ x: 'get' });
                done();
            });
        });

        it('throws on handler with invalid defaults', function (done) {

            var handler = function (route, options) {

                return function (request, reply) {

                    return reply(request.route.settings.app);
                };
            };

            handler.defaults = 'invalid';

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.handler('test', handler);
            }).to.throw('Handler defaults property must be an object or function');

            done();
        });
    });

    describe('invoke()', function () {

        it('returns 500 on ext method exception (same tick)', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();
            server.ext('onRequest', function (request, next) {

                var x = a.b.c;
            });

            var handler = function (request, reply) {

                return reply('neven gonna happen');
            };

            server.route({ method: 'GET', path: '/domain', handler: handler });

            server.inject('/domain', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});
