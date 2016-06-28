// Load modules

var Os = require('os');
var Path = require('path');
var Boom = require('boom');
var CatboxMemory = require('catbox-memory');
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


describe('Plugin', function () {

    describe('select()', function () {

        it('creates a subset of connections for manipulation', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['s1', 'a', 'b'] });
            server.connection({ labels: ['s2', 'a', 'c'] });
            server.connection({ labels: ['s3', 'a', 'b', 'd'] });
            server.connection({ labels: ['s4', 'b', 'x'] });

            var register = function (srv, options, next) {

                var a = srv.select('a');
                var ab = a.select('b');
                var memoryx = srv.select('x', 's4');
                var sodd = srv.select(['s2', 's4']);

                expect(srv.connections.length).to.equal(4);
                expect(a.connections.length).to.equal(3);
                expect(ab.connections.length).to.equal(2);
                expect(memoryx.connections.length).to.equal(1);
                expect(sodd.connections.length).to.equal(2);

                srv.route({
                    method: 'GET',
                    path: '/all',
                    handler: function (request, reply) {

                        return reply('all');
                    }
                });

                a.route({
                    method: 'GET',
                    path: '/a',
                    handler: function (request, reply) {

                        return reply('a');
                    }
                });

                ab.route({
                    method: 'GET',
                    path: '/ab',
                    handler: function (request, reply) {

                        return reply('ab');
                    }
                });

                memoryx.route({

                    method: 'GET',
                    path: '/memoryx',
                    handler: function (request, reply) {

                        return reply('memoryx');
                    }
                });

                sodd.route({
                    method: 'GET',
                    path: '/sodd',
                    handler: function (request, reply) {

                        return reply('sodd');
                    }
                });

                memoryx.state('sid', { encoding: 'base64' });
                srv.method({
                    name: 'testMethod', method: function (nxt) {

                        return nxt(null, '123');
                    }, options: { cache: { expiresIn: 1000 } }
                });

                srv.methods.testMethod(function (err, result1) {

                    expect(result1).to.equal('123');

                    srv.methods.testMethod(function (err, result2) {

                        expect(result2).to.equal('123');
                        return next();
                    });
                });
            };

            register.attributes = {
                name: 'plugin'
            };

            server.register(register, function (err) {

                expect(err).to.not.exist();

                expect(internals.routesList(server, 's1')).to.deep.equal(['/a', '/ab', '/all']);
                expect(internals.routesList(server, 's2')).to.deep.equal(['/a', '/all', '/sodd']);
                expect(internals.routesList(server, 's3')).to.deep.equal(['/a', '/ab', '/all']);
                expect(internals.routesList(server, 's4')).to.deep.equal(['/all', '/memoryx', '/sodd']);
                done();
            });
        });

        it('registers a plugin on selection inside a plugin', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a'] });
            server.connection({ labels: ['b'] });
            server.connection({ labels: ['c'] });

            var server1 = server.connections[0];
            var server2 = server.connections[1];
            var server3 = server.connections[2];

            var child = function (srv, options, next) {

                srv.expose('key2', srv.connections.length);
                return next();
            };

            child.attributes = {
                name: 'child'
            };

            var test = function (srv, options, next) {

                srv.expose('key1', srv.connections.length);
                srv.select('a').register(child, next);
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, { select: ['a', 'b'] }, function (err) {

                expect(err).to.not.exist();
                expect(server.plugins.test.key1).to.equal(2);
                expect(server.plugins.child.key2).to.equal(1);
                done();
            });
        });
    });

    describe('register()', function () {

        it('registers plugin with options', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a', 'b'] });

            var test = function (srv, options, next) {

                expect(options.something).to.be.true();
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register({ register: test, options: { something: true } }, function (err) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('registers a required plugin', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a', 'b'] });

            var test = {
                register: function (srv, options, next) {

                    expect(options.something).to.be.true();
                    return next();
                }
            };

            test.register.attributes = {
                name: 'test'
            };

            server.register({ register: test, options: { something: true } }, function (err) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('throws on bad plugin (missing attributes)', function (done) {

            var server = new Hapi.Server();
            expect(function () {

                server.register({
                    register: function (srv, options, next) {

                        return next();
                    }
                }, function (err) { });

            }).to.throw('Invalid plugin object - invalid or missing register function attributes property');

            done();
        });

        it('throws on bad plugin (missing name)', function (done) {

            var register = function (srv, options, next) {

                return next();
            };

            register.attributes = {};

            var server = new Hapi.Server();
            expect(function () {

                server.register(register, function (err) { });
            }).to.throw('Missing plugin name');

            done();
        });

        it('throws on bad plugin (empty pkg)', function (done) {

            var register = function (srv, options, next) {

                return next();
            };

            register.attributes = {
                pkg: {}
            };

            var server = new Hapi.Server();
            expect(function () {

                server.register(register, function (err) { });
            }).to.throw('Missing plugin name');

            done();
        });

        it('throws when register is missing a callback function', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a', 'b'] });

            var test = function (srv, options, next) {

                expect(options.something).to.be.true();
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            expect(function () {

                server.register(test);
            }).to.throw('A callback function is required to register a plugin');
            done();
        });

        it('returns plugin error', function (done) {

            var test = function (srv, options, next) {

                return next(new Error('from plugin'));
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.exist();
                expect(err.message).to.equal('from plugin');
                done();
            });
        });

        it('sets version to 0.0.0 if missing', function (done) {

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply(srv.version);
                    }
                });
                return next();
            };

            test.attributes = {
                pkg: {
                    name: 'steve'
                }
            };

            var server = new Hapi.Server();
            server.connection();

            server.register(test, function (err) {

                expect(err).to.not.exist();
                expect(server.connections[0]._registrations.steve.version).to.equal('0.0.0');
                server.inject('/', function (res) {

                    expect(res.result).to.equal(require('../package.json').version);
                    done();
                });
            });
        });

        it('prevents plugin from multiple registrations', function (done) {

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/a',
                    handler: function (request, reply) {

                        return reply('a');
                    }
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection({ host: 'example.com' });
            server.register(test, function (err) {

                expect(err).to.not.exist();
                expect(function () {

                    server.register(test, function (err) { });
                }).to.throw('Plugin test already registered in: http://example.com');

                done();
            });
        });

        it('allows plugin multiple registrations (attributes)', function (done) {

            var test = function (srv, options, next) {

                srv.app.x = srv.app.x ? srv.app.x + 1 : 1;
                return next();
            };

            test.attributes = {
                name: 'test',
                multiple: true
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.register(test, function (err) {

                    expect(err).to.not.exist();
                    expect(server.app.x).to.equal(2);
                    done();
                });
            });
        });

        it('registers multiple plugins', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            var log = null;
            server.once('log', function (event, tags) {

                log = [event, tags];
            });

            server.register([internals.plugins.test1, internals.plugins.test2], function (err) {

                expect(err).to.not.exist();
                expect(internals.routesList(server)).to.deep.equal(['/test1', '/test2']);
                expect(log[1].test).to.equal(true);
                expect(log[0].data).to.equal('abc');
                done();
            });
        });

        it('registers multiple plugins (verbose)', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            var log = null;
            server.once('log', function (event, tags) {

                log = [event, tags];
            });

            server.register([{ register: internals.plugins.test1 }, { register: internals.plugins.test2 }], function (err) {

                expect(err).to.not.exist();
                expect(internals.routesList(server)).to.deep.equal(['/test1', '/test2']);
                expect(log[1].test).to.equal(true);
                expect(log[0].data).to.equal('abc');
                done();
            });
        });

        it('registers a child plugin', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(internals.plugins.child, function (err) {

                expect(err).to.not.exist();
                server.inject('/test1', function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a plugin with routes path prefix', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(internals.plugins.test1, { routes: { prefix: '/xyz' } }, function (err) {

                expect(server.plugins.test1.prefix).to.equal('/xyz');
                expect(err).to.not.exist();
                server.inject('/xyz/test1', function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a plugin with routes path prefix and plugin root route', function (done) {

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(test, { routes: { prefix: '/xyz' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/xyz', function (res) {

                    expect(res.result).to.equal('ok');
                    done();
                });
            });
        });

        it('ignores the type of the plugin value', function (done) {

            var a = function () { };
            a.register = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
                return next();
            };

            a.register.attributes = { name: 'a' };

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(a, { routes: { prefix: '/xyz' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/xyz', function (res) {

                    expect(res.result).to.equal('ok');
                    done();
                });
            });
        });

        it('registers a child plugin with parent routes path prefix', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(internals.plugins.child, { routes: { prefix: '/xyz' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/xyz/test1', function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a child plugin with parent routes vhost prefix', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(internals.plugins.child, { routes: { vhost: 'example.com' } }, function (err) {

                expect(err).to.not.exist();
                server.inject({ url: '/test1', headers: { host: 'example.com' } }, function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a child plugin with parent routes path prefix and inner register prefix', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register({ register: internals.plugins.child, options: { routes: { prefix: '/inner' } } }, { routes: { prefix: '/xyz' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/xyz/inner/test1', function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a child plugin with parent routes vhost prefix and inner register vhost', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register({ register: internals.plugins.child, options: { routes: { vhost: 'example.net' } } }, { routes: { vhost: 'example.com' } }, function (err) {

                expect(err).to.not.exist();
                server.inject({ url: '/test1', headers: { host: 'example.com' } }, function (res) {

                    expect(res.result).to.equal('testing123');
                    done();
                });
            });
        });

        it('registers a plugin with routes vhost', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'test' });
            server.register(internals.plugins.test1, { routes: { vhost: 'example.com' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/test1', function (res1) {

                    expect(res1.statusCode).to.equal(404);

                    server.inject({ url: '/test1', headers: { host: 'example.com' } }, function (res2) {

                        expect(res2.result).to.equal('testing123');
                        done();
                    });
                });
            });
        });

        it('registers plugins with pre-selected label', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a'] });
            server.connection({ labels: ['b'] });

            var server1 = server.connections[0];
            var server2 = server.connections[1];

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, { select: 'a' }, function (err) {

                expect(err).to.not.exist();
                server1.inject('/', function (res1) {

                    expect(res1.statusCode).to.equal(200);
                    server2.inject('/', function (res2) {

                        expect(res2.statusCode).to.equal(404);
                        done();
                    });
                });
            });
        });

        it('registers plugins with pre-selected labels', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a'] });
            server.connection({ labels: ['b'] });
            server.connection({ labels: ['c'] });

            var server1 = server.connections[0];
            var server2 = server.connections[1];
            var server3 = server.connections[2];

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
                srv.expose('super', 'trooper');
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, { select: ['a', 'c'] }, function (err) {

                expect(err).to.not.exist();
                expect(server.plugins.test.super).to.equal('trooper');

                server1.inject('/', function (res1) {

                    expect(res1.statusCode).to.equal(200);
                    server2.inject('/', function (res2) {

                        expect(res2.statusCode).to.equal(404);
                        server3.inject('/', function (res3) {

                            expect(res3.statusCode).to.equal(200);
                            done();
                        });
                    });
                });
            });
        });

        it('sets multiple dependencies in one statement', function (done) {

            var a = function (srv, options, next) {

                srv.dependency(['b', 'c']);
                return next();
            };

            a.attributes = {
                name: 'a'
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var c = function (srv, options, next) {

                return next();
            };

            c.attributes = {
                name: 'c'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(b, function (err) {

                server.register(c, function (err) {

                    server.register(a, function (err) {

                        done();
                    });
                });
            });
        });

        it('sets multiple dependencies in attributes', function (done) {

            var a = function (srv, options, next) {

                return next();
            };

            a.attributes = {
                name: 'a',
                dependencies: ['b', 'c']
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var c = function (srv, options, next) {

                return next();
            };

            c.attributes = {
                name: 'c'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(b, function (err) {

                server.register(c, function (err) {

                    server.register(a, function (err) {

                        done();
                    });
                });
            });
        });

        it('sets multiple dependencies in multiple statements', function (done) {

            var a = function (srv, options, next) {

                srv.dependency('b');
                srv.dependency('c');
                return next();
            };

            a.attributes = {
                name: 'a'
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var c = function (srv, options, next) {

                return next();
            };

            c.attributes = {
                name: 'c'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(b, function (err) {

                server.register(c, function (err) {

                    server.register(a, function (err) {

                        done();
                    });
                });
            });
        });

        it('sets multiple dependencies in multiple locations', function (done) {

            var a = function (srv, options, next) {

                srv.dependency('b');
                return next();
            };

            a.attributes = {
                name: 'a',
                dependecies: 'c'
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var c = function (srv, options, next) {

                return next();
            };

            c.attributes = {
                name: 'c'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(b, function (err) {

                server.register(c, function (err) {

                    server.register(a, function (err) {

                        done();
                    });
                });
            });
        });

        it('throws when dependencies is an object', function (done) {

            var a = function (srv, options, next) {

                next();
            };
            a.attributes = {
                name: 'a',
                dependencies: { b: true }
            };

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.register(a, function () {});
            }).to.throw('Invalid dependencies options (must be a string or an array of strings) {\n  \"b\": true,\n  \u001b[41m\"0\"\u001b[0m\u001b[31m [1]: -- missing --\u001b[0m\n}\n\u001b[31m\n[1] "0" must be a string\u001b[0m');
            done();
        });

        it('throws when dependencies contain something else than a string', function (done) {

            var a = function (srv, options, next) {

                next();
            };
            a.attributes = {
                name: 'a',
                dependencies: [true]
            };

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.register(a, function () {});
            }).to.throw('Invalid dependencies options (must be a string or an array of strings) [\n  null\n]\n\u001b[31m\n[1] "0" must be a string\u001b[0m');
            done();
        });
    });

    describe('after()', function () {

        it('calls method after plugin', function (done) {

            var x = function (srv, options, next) {

                srv.expose('a', 'b');
                return next();
            };

            x.attributes = {
                name: 'x'
            };

            var server = new Hapi.Server();
            server.connection();

            expect(server.plugins.x).to.not.exist();

            var called = false;
            server.after(function (srv, next) {

                expect(srv.plugins.x.a).to.equal('b');
                called = true;
                return next();
            }, 'x');

            server.register(x, function (err) {

                expect(err).to.not.exist();
                server.start(function (err) {

                    expect(called).to.be.true();
                    done();
                });
            });
        });

        it('calls method before start', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var called = false;
            server.after(function (srv, next) {

                called = true;
                return next();
            });

            server.start(function (err) {

                expect(called).to.be.true();
                done();
            });
        });

        it('calls method before start even if plugin not registered', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var called = false;
            server.after(function (srv, next) {

                called = true;
                return next();
            }, 'x');

            server.start(function (err) {

                expect(called).to.be.true();
                done();
            });
        });

        it('fails to start server when after method fails', function (done) {

            var test = function (srv, options, next) {

                srv.after(function (inner, finish) {

                    return finish();
                });

                srv.after(function (inner, finish) {

                    return finish(new Error('Not in the mood'));
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.start(function (err) {

                    expect(err).to.exist();
                    done();
                });
            });
        });
    });

    describe('auth', function () {

        it('adds auth strategy via plugin', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: 'a' });
            server.connection({ labels: 'b' });
            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply('authenticated!');
                }
            });

            server.register(internals.plugins.auth, function (err) {

                expect(err).to.not.exist();

                server.inject('/', function (res1) {

                    expect(res1.statusCode).to.equal(401);
                    server.inject({ method: 'GET', url: '/', headers: { authorization: 'Basic ' + (new Buffer('john:12345', 'utf8')).toString('base64') } }, function (res2) {

                        expect(res2.statusCode).to.equal(200);
                        expect(res2.result).to.equal('authenticated!');
                        done();
                    });
                });
            });
        });
    });

    describe('bind()', function () {

        it('sets plugin context', function (done) {

            var test = function (srv, options, next) {

                var bind = {
                    value: 'in context',
                    suffix: ' throughout'
                };

                srv.bind(bind);

                srv.route({
                    method: 'GET',
                    path: '/',
                    handler: function (request, reply) {

                        return reply(this.value);
                    }
                });

                srv.ext('onPreResponse', function (request, reply) {

                    return reply(request.response.source + this.suffix);
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.inject('/', function (res) {

                    expect(res.result).to.equal('in context throughout');
                    done();
                });
            });
        });
    });

    describe('cache()', function () {

        it('provisions a server cache', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var cache = server.cache({ segment: 'test', expiresIn: 1000 });
            server.start(function () {

                cache.set('a', 'going in', 0, function (err) {

                    cache.get('a', function (err, value, cached, report) {

                        expect(value).to.equal('going in');

                        server.stop(function () {

                            done();
                        });
                    });
                });
            });
        });

        it('throws when missing segment', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.cache({ expiresIn: 1000 });
            }).to.throw('Missing cache segment name');
            done();
        });

        it('provisions a server cache with custom partition', function (done) {

            var server = new Hapi.Server({ cache: { engine: CatboxMemory, partition: 'hapi-test-other' } });
            server.connection();
            var cache = server.cache({ segment: 'test', expiresIn: 1000 });
            server.start(function () {

                cache.set('a', 'going in', 0, function (err) {

                    cache.get('a', function (err, value, cached, report) {

                        expect(value).to.equal('going in');
                        expect(cache._cache.connection.settings.partition).to.equal('hapi-test-other');

                        server.stop(function () {

                            done();
                        });
                    });
                });
            });
        });

        it('throws when allocating an invalid cache segment', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.cache({ segment: 'a', expiresAt: '12:00', expiresIn: 1000 });
            }).throws();

            done();
        });

        it('allows allocating a cache segment with empty options', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.cache({ segment: 'a' });
            }).to.not.throw();

            done();
        });

        it('allows reusing the same cache segment (server)', function (done) {

            var server = new Hapi.Server({ cache: { engine: CatboxMemory, shared: true } });
            server.connection();
            expect(function () {

                var a1 = server.cache({ segment: 'a', expiresIn: 1000 });
                var a2 = server.cache({ segment: 'a', expiresIn: 1000 });
            }).to.not.throw();
            done();
        });

        it('allows reusing the same cache segment (cache)', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                var a1 = server.cache({ segment: 'a', expiresIn: 1000 });
                var a2 = server.cache({ segment: 'a', expiresIn: 1000, shared: true });
            }).to.not.throw();
            done();
        });

        it('uses plugin cache interface', function (done) {

            var test = function (srv, options, next) {

                var cache = srv.cache({ expiresIn: 10 });
                srv.expose({
                    get: function (key, callback) {

                        cache.get(key, function (err, value, cached, report) {

                            callback(err, value);
                        });
                    },
                    set: function (key, value, callback) {

                        cache.set(key, value, 0, callback);
                    }
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.start(function () {

                    server.plugins.test.set('a', '1', function (err) {

                        expect(err).to.not.exist();
                        server.plugins.test.get('a', function (err, value1) {

                            expect(err).to.not.exist();
                            expect(value1).to.equal('1');
                            setTimeout(function () {

                                server.plugins.test.get('a', function (err, value2) {

                                    expect(err).to.not.exist();
                                    expect(value2).to.equal(null);
                                    done();
                                });
                            }, 11);
                        });
                    });
                });
            });
        });
    });

    describe('decorate()', function () {

        it('decorates request', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.decorate('request', 'getId', function () {

                return this.id;
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply(request.getId());
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.match(/^.*\:.*\:.*\:.*\:.*$/);
                done();
            });
        });

        it('decorates reply', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.decorate('reply', 'success', function () {

                return this.response({ status: 'ok' });
            });

            server.route({
                method: 'GET',
                path: '/',
                handler: function (request, reply) {

                    return reply.success();
                }
            });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result.status).to.equal('ok');
                done();
            });
        });

        it('throws on double reply decoration', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.decorate('reply', 'success', function () {

                return this.response({ status: 'ok' });
            });

            expect(function () {

                server.decorate('reply', 'success', function () { });
            }).to.throw('Reply interface decoration already defined: success');
            done();
        });

        it('throws on internal conflict', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.decorate('reply', 'redirect', function () { });
            }).to.throw('Cannot override built-in reply interface decoration: redirect');
            done();
        });

        it('decorates server', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.decorate('server', 'ok', function (path) {

                server.route({
                    method: 'GET',
                    path: path,
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
            });

            server.ok('/');

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('ok');
                done();
            });
        });

        it('throws on double server decoration', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.decorate('server', 'ok', function (path) {

                server.route({
                    method: 'GET',
                    path: path,
                    handler: function (request, reply) {

                        return reply('ok');
                    }
                });
            });

            expect(function () {

                server.decorate('server', 'ok', function () { });
            }).to.throw('Server decoration already defined: ok');
            done();
        });

        it('throws on server decoration root conflict', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.decorate('server', 'start', function () { });
            }).to.throw('Cannot override the built-in server interface method: start');
            done();
        });

        it('throws on server decoration plugin conflict', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.decorate('server', 'select', function () { });
            }).to.throw('Cannot override the built-in server interface method: select');
            done();
        });

        it('throws on invalid decoration name', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.decorate('server', '_special', function () { });
            }).to.throw('Property name cannot begin with an underscore: _special');
            done();
        });
    });

    describe('dependency()', function () {

        it('fails to register single plugin with dependencies', function (done) {

            var test = function (srv, options, next) {

                srv.dependency('none');
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(function () {

                    server.start();
                }).to.throw('Plugin test missing dependency none in connection: ' + server.info.uri);
                done();
            });
        });

        it('fails to register single plugin with dependencies (attributes)', function (done) {

            var test = function (srv, options, next) {

                return next();
            };

            test.attributes = {
                name: 'test',
                dependencies: 'none'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(function () {

                    server.start();
                }).to.throw('Plugin test missing dependency none in connection: ' + server.info.uri);
                done();
            });
        });

        it('fails to register multiple plugins with dependencies', function (done) {

            var server = new Hapi.Server();
            server.connection({ port: 80, host: 'localhost' });
            server.register([internals.plugins.deps1, internals.plugins.deps3], function (err) {

                expect(function () {

                    server.start();
                }).to.throw('Plugin deps1 missing dependency deps2 in connection: http://localhost:80');
                done();
            });
        });

        it('recognizes dependencies from peer plugins', function (done) {

            var a = function (srv, options, next) {

                srv.register(b, next);
            };

            a.attributes = {
                name: 'a'
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var c = function (srv, options, next) {

                srv.dependency('b');
                return next();
            };

            c.attributes = {
                name: 'c'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register([a, c], function (err) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('errors when missing inner dependencies', function (done) {

            var a = function (srv, options, next) {

                srv.register(b, next);
            };

            a.attributes = {
                name: 'a'
            };

            var b = function (srv, options, next) {

                srv.dependency('c');
                return next();
            };

            b.attributes = {
                name: 'b'
            };

            var server = new Hapi.Server();
            server.connection({ port: 80, host: 'localhost' });
            server.register(a, function (err) {

                expect(function () {

                    server.start();
                }).to.throw('Plugin b missing dependency c in connection: http://localhost:80');
                done();
            });
        });

        it('errors when missing inner dependencies (attributes)', function (done) {

            var a = function (srv, options, next) {

                srv.register(b, next);
            };

            a.attributes = {
                name: 'a'
            };

            var b = function (srv, options, next) {

                return next();
            };

            b.attributes = {
                name: 'b',
                dependencies: 'c'
            };

            var server = new Hapi.Server();
            server.connection({ port: 80, host: 'localhost' });
            server.register(a, function (err) {

                expect(function () {

                    server.start();
                }).to.throw('Plugin b missing dependency c in connection: http://localhost:80');
                done();
            });
        });
    });

    describe('events', function () {

        it('plugin event handlers receive more than 2 arguments when they exist', function (done) {

            var test = function (srv, options, next) {

                srv.once('request-internal', function () {

                    expect(arguments).to.have.length(3);
                    done();
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.inject({ url: '/' }, function () { });
            });
        });

        it('listens to events on selected connections', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a'] });
            server.connection({ labels: ['b'] });
            server.connection({ labels: ['c'] });

            var server1 = server.connections[0];
            var server2 = server.connections[1];
            var server3 = server.connections[2];

            var counter = 0;
            var test = function (srv, options, next) {

                srv.select(['a', 'b']).on('test', function () {

                    ++counter;
                });

                srv.select(['a']).on('start', function () {

                    ++counter;
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, function (err) {

                expect(err).to.not.exist();
                server1.emit('test');
                server2.emit('test');
                server3.emit('test');

                server.start(function () {

                    server.stop(function () {

                        expect(counter).to.equal(3);
                        done();
                    });
                });
            });
        });
    });

    describe('expose()', function () {

        it('exposes an api', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['s1', 'a', 'b'] });
            server.connection({ labels: ['s2', 'a', 'test'] });
            server.connection({ labels: ['s3', 'a', 'b', 'd', 'cache'] });
            server.connection({ labels: ['s4', 'b', 'test', 'cache'] });

            server.register(internals.plugins.test1, function (err) {

                expect(err).to.not.exist();

                expect(server.connections[0]._router.routes.get).to.not.exist();
                expect(internals.routesList(server, 's2')).to.deep.equal(['/test1']);
                expect(server.connections[2]._router.routes.get).to.not.exist();
                expect(internals.routesList(server, 's4')).to.deep.equal(['/test1']);

                expect(server.plugins.test1.add(1, 3)).to.equal(4);
                expect(server.plugins.test1.glue('1', '3')).to.equal('13');

                done();
            });
        });
    });

    describe('ext()', function () {

        it('extends onRequest point', function (done) {

            var test = function (srv, options, next) {

                srv.route({
                    method: 'GET',
                    path: '/b',
                    handler: function (request, reply) {

                        return reply('b');
                    }
                });

                srv.ext('onRequest', function (request, reply) {

                    request.setUrl('/b');
                    return reply.continue();
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                expect(internals.routesList(server)).to.deep.equal(['/b']);

                server.inject('/a', function (res) {

                    expect(res.result).to.equal('b');
                    done();
                });
            });
        });

        it('adds multiple ext functions with simple dependencies', function (done) {

            var server = new Hapi.Server();
            server.connection({ labels: ['a', 'b', '0'] });
            server.connection({ labels: ['a', 'c', '1'] });
            server.connection({ labels: ['c', 'b', '2'] });

            var handler = function (request, reply) {

                return reply(request.app.deps);
            };

            server.select('0').route({ method: 'GET', path: '/', handler: handler });
            server.select('1').route({ method: 'GET', path: '/', handler: handler });
            server.select('2').route({ method: 'GET', path: '/', handler: handler });

            server.register([internals.plugins.deps1, internals.plugins.deps2, internals.plugins.deps3], function (err) {

                expect(err).to.not.exist();

                server.start(function (err) {

                    expect(err).to.not.exist();
                    expect(server.plugins.deps1.breaking).to.equal('bad');

                    server.connections[0].inject('/', function (res1) {

                        expect(res1.result).to.equal('|2|1|');

                        server.connections[1].inject('/', function (res2) {

                            expect(res2.result).to.equal('|3|1|');

                            server.connections[2].inject('/', function (res3) {

                                expect(res3.result).to.equal('|3|2|');
                                done();
                            });
                        });
                    });
                });
            });
        });

        it('adds multiple ext functions with complex dependencies', function (done) {

            // Generate a plugin with a specific index and ext dependencies.

            var pluginCurrier = function (num, deps) {

                var plugin = function (server, options, next) {

                    server.ext('onRequest', function (request, reply) {

                        request.app.complexDeps = request.app.complexDeps || '|';
                        request.app.complexDeps += num + '|';
                        return reply.continue();
                    }, deps);

                    next();
                };

                plugin.attributes = {
                  name: 'deps' + num
                };

                return plugin;
            };

            var handler = function (request, reply) {

                return reply(request.app.complexDeps);
            };

            var server = new Hapi.Server();
            server.connection();

            server.route({ method: 'GET', path: '/', handler: handler });

            server.register([
                pluginCurrier(1, { after: 'deps2' }),
                pluginCurrier(2),
                pluginCurrier(3, { before: ['deps1', 'deps2'] })
            ], function (err) {

                expect(err).to.not.exist();

                server.start(function (err) {

                    expect(err).to.not.exist();

                    server.inject('/', function (res) {

                        expect(res.result).to.equal('|3|2|1|');
                        done();
                    });
                });
            });
        });

        it('throws when adding ext without connections', function (done) {

            var server = new Hapi.Server();
            expect(function () {

                server.ext('onRequest', function () { });
            }).to.throw('Cannot add ext without a connection');

            done();
        });
    });

    describe('handler()', function () {

        it('add new handler', function (done) {

            var test = function (srv, options1, next) {

                srv.handler('bar', function (route, options2) {

                    return function (request, reply) {

                        return reply('success');
                    };
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.route({
                    method: 'GET',
                    path: '/',
                    handler: {
                        bar: {}
                    }
                });

                server.inject('/', function (res) {

                    expect(res.payload).to.equal('success');
                    done();
                });
            });
        });

        it('errors on duplicate handler', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.handler('proxy', function () { });
            }).to.throw('Handler name already exists: proxy');
            done();
        });

        it('errors on unknown handler', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.route({ method: 'GET', path: '/', handler: { test: {} } });
            }).to.throw('Unknown handler: test');
            done();
        });

        it('errors on non-string name', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.handler();
            }).to.throw('Invalid handler name');
            done();
        });

        it('errors on non-function handler', function (done) {

            var server = new Hapi.Server();
            server.connection();

            expect(function () {

                server.handler('foo', 'bar');
            }).to.throw('Handler must be a function: foo');
            done();
        });
    });

    describe('log()', { parallel: false }, function () {

        it('emits a log event', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var count = 0;
            server.once('log', function (event) {

                ++count;
                expect(event.data).to.equal('log event 1');
            });

            server.once('log', function (event) {

                ++count;
                expect(event.data).to.equal('log event 1');
            });

            server.log('1', 'log event 1', Date.now());

            server.once('log', function (event) {

                ++count;
                expect(event.data).to.equal('log event 2');
            });

            server.log(['2'], 'log event 2', new Date(Date.now()));

            expect(count).to.equal(3);
            done();
        });

        it('emits a log event and print to console', { parallel: false }, function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.once('log', function (event) {

                expect(event.data).to.equal('log event 1');
            });

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('internal, implementation, error');

                done();
            };

            server.log(['internal', 'implementation', 'error'], 'log event 1');
        });

        it('outputs log data to debug console', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.equal('\n    {"data":1}');
                done();
            };

            server.log(['implementation'], { data: 1 });
        });

        it('outputs log error data to debug console', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.contain('\n    Error: test\n    at');
                done();
            };

            server.log(['implementation'], new Error('test'));
        });

        it('outputs log data to debug console without data', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var orig = console.error;
            console.error = function () {

                console.error = orig;
                expect(arguments[0]).to.equal('Debug:');
                expect(arguments[1]).to.equal('implementation');
                expect(arguments[2]).to.equal('');
                done();
            };

            server.log(['implementation']);
        });

        it('does not output events when debug disabled', function (done) {

            var server = new Hapi.Server({ debug: false });
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            server.log(['implementation']);
            console.error('nothing');
            expect(i).to.equal(1);
            console.error = orig;
            done();
        });

        it('does not output events when debug.log disabled', function (done) {

            var server = new Hapi.Server({ debug: { log: false } });
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            server.log(['implementation']);
            console.error('nothing');
            expect(i).to.equal(1);
            console.error = orig;
            done();
        });

        it('does not output non-implementation events by default', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var i = 0;
            var orig = console.error;
            console.error = function () {

                ++i;
            };

            server.log(['xyz']);
            console.error('nothing');
            expect(i).to.equal(1);
            console.error = orig;
            done();
        });

        it('emits server log events once', function (done) {

            var pc = 0;
            var test = function (srv, options, next) {

                srv.on('log', function (event, tags) {

                    ++pc;
                });

                next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();

            var sc = 0;
            server.on('log', function (event, tags) {

                ++sc;
            });

            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.log('test');
                expect(sc).to.equal(1);
                expect(pc).to.equal(1);
                done();
            });
        });
    });

    describe('lookup()', function () {

        it('returns route based on id', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'root',
                    app: { test: 123 }
                }
            });

            var root = server.lookup('root');
            expect(root.path).to.equal('/');
            expect(root.settings.app.test).to.equal(123);
            done();
        });

        it('returns null on unknown route', function (done) {

            var server = new Hapi.Server();
            server.connection();
            var root = server.lookup('root');
            expect(root).to.be.null();
            done();
        });

        it('throws on missing id', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.lookup();
            }).to.throw('Invalid route id: ');
            done();
        });
    });

    describe('match()', function () {

        it('returns route based on path', function (done) {

            var server = new Hapi.Server();
            server.connection();

            server.route({
                method: 'GET',
                path: '/',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'root'
                }
            });

            server.route({
                method: 'GET',
                path: '/abc',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'abc'
                }
            });

            server.route({
                method: 'POST',
                path: '/abc',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'post'
                }
            });

            server.route({
                method: 'GET',
                path: '/{p}/{x}',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'params'
                }
            });

            server.route({
                method: 'GET',
                path: '/abc',
                vhost: 'example.com',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    },
                    id: 'vhost'
                }
            });

            expect(server.match('GET', '/').settings.id).to.equal('root');
            expect(server.match('GET', '/none')).to.equal(null);
            expect(server.match('GET', '/abc').settings.id).to.equal('abc');
            expect(server.match('get', '/').settings.id).to.equal('root');
            expect(server.match('post', '/abc').settings.id).to.equal('post');
            expect(server.match('get', '/a/b').settings.id).to.equal('params');
            expect(server.match('GET', '/abc', 'example.com').settings.id).to.equal('vhost');
            done();
        });

        it('throws on missing method', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match();
            }).to.throw('Invalid method: ');
            done();
        });

        it('throws on invalid method', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match(5);
            }).to.throw('Invalid method: 5');
            done();
        });

        it('throws on missing path', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match('get');
            }).to.throw('Invalid path: ');
            done();
        });

        it('throws on invalid path type', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match('get', 5);
            }).to.throw('Invalid path: 5');
            done();
        });

        it('throws on invalid path prefix', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match('get', '5');
            }).to.throw('Invalid path: 5');
            done();
        });

        it('throws on invalid path', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.route({
                method: 'GET',
                path: '/{p}',
                config: {
                    handler: function (request, reply) {

                        return reply();
                    }
                }
            });

            expect(function () {

                server.match('GET', '/%p');
            }).to.throw('Invalid path: /%p');
            done();
        });

        it('throws on invalid host type', function (done) {

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.match('get', '/a', 5);
            }).to.throw('Invalid host: 5');
            done();
        });
    });

    describe('method()', function () {

        it('adds server method using arguments', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var test = function (srv, options, next) {

                srv.method('log', function (methodNext) {

                    return methodNext(null);
                });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, function (err) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('adds server method with plugin bind', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var test = function (srv, options, next) {

                srv.bind({ x: 1 });
                srv.method('log', function (methodNext) {

                    return methodNext(null, this.x);
                });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.methods.log(function (err, result) {

                    expect(result).to.equal(1);
                    done();
                });
            });
        });

        it('adds server method with method bind', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var test = function (srv, options, next) {

                srv.method('log', function (methodNext) {

                    return methodNext(null, this.x);
                }, { bind: { x: 2 } });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.methods.log(function (err, result) {

                    expect(result).to.equal(2);
                    done();
                });
            });
        });

        it('adds server method with method and ext bind', function (done) {

            var server = new Hapi.Server();
            server.connection();

            var test = function (srv, options, next) {

                srv.bind({ x: 1 });
                srv.method('log', function (methodNext) {

                    return methodNext(null, this.x);
                }, { bind: { x: 2 } });
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.methods.log(function (err, result) {

                    expect(result).to.equal(2);
                    done();
                });
            });
        });
    });

    describe('path()', function () {

        it('sets local path for directory route handler', function (done) {

            var test = function (srv, options, next) {

                srv.path(Path.join(__dirname, '..'));

                srv.route({
                    method: 'GET',
                    path: '/handler/{file*}',
                    handler: {
                        directory: {
                            path: './'
                        }
                    }
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection({ routes: { files: { relativeTo: __dirname } } });
            server.register(test, function (err) {

                expect(err).to.not.exist();
                server.inject('/handler/package.json', function (res) {

                    expect(res.statusCode).to.equal(200);
                    done();
                });
            });
        });

        it('throws when plugin sets undefined path', function (done) {

            var test = function (srv, options, next) {

                srv.path();
                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            expect(function () {

                server.register(test, function (err) { });
            }).to.throw('relativeTo must be a non-empty string');
            done();
        });
    });

    describe('render()', function () {

        it('renders view', function (done) {

            var server = new Hapi.Server();
            server.connection();
            server.views({
                engines: { html: Handlebars },
                path: __dirname + '/templates'
            });

            server.render('test', { title: 'test', message: 'Hapi' }, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });
    });

    describe('state()', function () {

        it('throws when adding state without connections', function (done) {

            var server = new Hapi.Server();
            expect(function () {

                server.state('sid', { encoding: 'base64' });
            }).to.throw('Cannot add state without a connection');

            done();
        });
    });

    describe('views()', function () {

        it('requires plugin with views', function (done) {

            var test = function (srv, options, next) {

                srv.path(__dirname);

                var views = {
                    engines: { 'html': Handlebars },
                    path: './templates/plugin'
                };

                srv.views(views);
                if (Object.keys(views).length !== 2) {
                    return next(new Error('plugin.view() modified options'));
                }

                srv.route([
                    {
                        path: '/view', method: 'GET', handler: function (request, reply) {

                            return reply.view('test', { message: options.message });
                        }
                    },
                    {
                        path: '/file', method: 'GET', handler: { file: './templates/plugin/test.html' }
                    }
                ]);

                srv.ext('onRequest', function (request, reply) {

                    if (request.path === '/ext') {
                        return reply.view('test', { message: 'grabbed' });
                    }

                    return reply.continue();
                });

                return next();
            };

            test.attributes = {
                name: 'test'
            };

            var server = new Hapi.Server();
            server.connection();
            server.register({ register: test, options: { message: 'viewing it' } }, function (err) {

                expect(err).to.not.exist();
                server.inject('/view', function (res1) {

                    expect(res1.result).to.equal('<h1>viewing it</h1>');

                    server.inject('/file', function (res2) {

                        expect(res2.result).to.equal('<h1>{{message}}</h1>');

                        server.inject('/ext', function (res3) {

                            expect(res3.result).to.equal('<h1>grabbed</h1>');
                            done();
                        });
                    });
                });
            });
        });
    });
});


internals.routesList = function (server, label) {

    var tables = server.select(label || []).table();

    var list = [];
    for (var c = 0, cl = tables.length; c < cl; ++c) {
        var routes = tables[c].table;
        for (var i = 0, il = routes.length; i < il; ++i) {
            var route = routes[i];
            if (route.method === 'get') {
                list.push(route.path);
            }
        }
    }

    return list;
};


internals.plugins = {
    auth: function (server, options, next) {

        server.auth.scheme('basic', function (srv, authOptions) {

            var settings = Hoek.clone(authOptions);

            var scheme = {
                authenticate: function (request, reply) {

                    var req = request.raw.req;
                    var authorization = req.headers.authorization;
                    if (!authorization) {
                        return reply(Boom.unauthorized(null, 'Basic'));
                    }

                    var parts = authorization.split(/\s+/);

                    if (parts[0] &&
                        parts[0].toLowerCase() !== 'basic') {

                        return reply(Boom.unauthorized(null, 'Basic'));
                    }

                    if (parts.length !== 2) {
                        return reply(Boom.badRequest('Bad HTTP authentication header format', 'Basic'));
                    }

                    var credentialsParts = new Buffer(parts[1], 'base64').toString().split(':');
                    if (credentialsParts.length !== 2) {
                        return reply(Boom.badRequest('Bad header internal syntax', 'Basic'));
                    }

                    var username = credentialsParts[0];
                    var password = credentialsParts[1];

                    settings.validateFunc(username, password, function (err, isValid, credentials) {

                        if (!isValid) {
                            return reply(Boom.unauthorized('Bad username or password', 'Basic'), { credentials: credentials });
                        }

                        return reply.continue({ credentials: credentials });
                    });
                }
            };

            return scheme;
        });

        var loadUser = function (username, password, callback) {

            if (username === 'john') {
                return callback(null, password === '12345', { user: 'john' });
            }

            return callback(null, false);
        };

        server.auth.strategy('basic', 'basic', 'required', { validateFunc: loadUser });

        server.auth.scheme('special', function () {

            return { authenticate: function () { } };
        });

        server.auth.strategy('special', 'special', {});

        return next();
    },
    child: function (server, options, next) {

        if (options.routes) {
            return server.register(internals.plugins.test1, options, next);
        }

        return server.register(internals.plugins.test1, next);
    },
    deps1: function (server, options, next) {

        server.dependency('deps2', function (srv, nxt) {

            srv.expose('breaking', srv.plugins.deps2.breaking);
            return nxt();
        });

        var selection = server.select('a');
        if (selection.connections.length) {
            selection.ext('onRequest', function (request, reply) {

                request.app.deps = request.app.deps || '|';
                request.app.deps += '1|';
                return reply.continue();
            }, { after: 'deps3' });
        }

        return next();
    },
    deps2: function (server, options, next) {

        var selection = server.select('b');
        if (selection.connections.length) {
            selection.ext('onRequest', function (request, reply) {

                request.app.deps = request.app.deps || '|';
                request.app.deps += '2|';
                return reply.continue();
            }, { after: 'deps3', before: 'deps1' });
        }

        server.expose('breaking', 'bad');

        return next();
    },
    deps3: function (server, options, next) {

        var selection = server.select('c');
        if (selection.connections.length) {
            selection.ext('onRequest', function (request, reply) {

                request.app.deps = request.app.deps || '|';
                request.app.deps += '3|';
                return reply.continue();
            });
        }

        return next();
    },
    test1: function (server, options, next) {

        var handler = function (request, reply) {

            return reply('testing123' + ((server.settings.app && server.settings.app.my) || ''));
        };

        server.select('test').route({ path: '/test1', method: 'GET', handler: handler });

        server.expose({
            add: function (a, b) {

                return a + b;
            }
        });

        server.expose('glue', function (a, b) {

            return a + b;
        });

        server.expose('prefix', server.realm.modifiers.route.prefix);

        return next();
    },
    test2: function (server, options, next) {

        server.route({
            path: '/test2',
            method: 'GET',
            handler: function (request, reply) {

                return reply('testing123');
            }
        });
        server.log('test', 'abc');
        return next();
    }
};


internals.plugins.auth.attributes = {
    name: 'auth'
};


internals.plugins.child.attributes = {
    name: 'child'
};


internals.plugins.deps1.attributes = {
    name: 'deps1'
};


internals.plugins.deps2.attributes = {
    name: 'deps2'
};


internals.plugins.deps3.attributes = {
    name: 'deps3'
};


internals.plugins.test1.attributes = {
    name: 'test1',
    version: '1.0.0'
};


internals.plugins.test2.attributes = {
    pkg: {
        name: 'test2',
        version: '1.0.0'
    }
};
