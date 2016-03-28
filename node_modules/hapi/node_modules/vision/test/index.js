// Load modules

var Path = require('path');
var Code = require('code');
var Handlebars = require('handlebars');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Jade = require('jade');
var Lab = require('lab');
var Vision = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('handler()', function () {

    it('handles routes to views', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/{param}', handler: { view: 'valid/handler' } });
        server.inject({
            method: 'GET',
            url: '/hello'
        }, function (res) {

            expect(res.result).to.contain('hello');
            done();
        });
    });

    it('handles custom context', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { jade: Jade },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/index', context: { message: 'heyloo' } } } });
        server.inject('/', function (res) {

            expect(res.result).to.contain('heyloo');
            done();
        });
    });

    it('handles custom options', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',
            layoutPath: __dirname + '/templates/layout'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/options', options: { layout: 'elsewhere' } } } });
        server.inject('/', function (res) {

            expect(res.result).to.contain('+hello');
            done();
        });
    });

    it('includes prerequisites in the default view context', function (done) {

        var pre = function (request, reply) {

            reply('PreHello');
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({
            method: 'GET',
            path: '/',
            config: {
                pre: [
                    { method: pre, assign: 'p' }
                ],
                handler: {
                    view: 'valid/handler'
                }
            }
        });

        server.inject('/', function (res) {

            expect(res.result).to.contain('PreHello');
            done();
        });
    });

    it('handles both custom and default contexts', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'heyloo' } } } });
        server.inject('/?test=yes', function (res) {

            expect(res.result).to.contain('heyloo');
            expect(res.result).to.contain('yes');
            done();
        });
    });

    it('overrides default contexts when provided with context of same name', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'heyloo', query: { test: 'no' } } } } });
        server.inject('/?test=yes', function (res) {

            expect(res.result).to.contain('heyloo');
            expect(res.result).to.contain('no');
            done();
        });
    });

    it('handles a global context', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',
            context: {
                message: 'default message'
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext' } } });
        server.inject('/', function (res) {

            expect(res.result).to.contain('<h1></h1>');
            expect(res.result).to.contain('<h1>default message</h1>');
            done();
        });
    });

    it('overrides the global context with the default handler context', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',

            context: {
                message: 'default message',
                query: {
                    test: 'global'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext' } } });
        server.inject('/?test=yes', function (res) {

            expect(res.result).to.contain('<h1>yes</h1>');
            expect(res.result).to.contain('<h1>default message</h1>');
            done();
        });
    });

    it('overrides the global and default contexts with a custom handler context', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { html: require('handlebars') },
            path: __dirname + '/templates',

            context: {
                message: 'default message',

                query: {
                    test: 'global'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/testContext', context: { message: 'override', query: { test: 'no' } } } } });
        server.inject('/?test=yes', function (res) {

            expect(res.result).to.contain('<h1>no</h1>');
            expect(res.result).to.contain('<h1>override</h1>');
            done();
        });
    });

    it('throws on missing views', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.register(Vision, Hoek.ignore);
        server.connection();
        server.route({
            path: '/',
            method: 'GET',
            handler: function (request, reply) {

                return reply.view('test', { message: 'steve' });
            }
        });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });
});

describe('render()', function () {

    it('renders view (root)', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.views({
            engines: { html: Handlebars },
            path: __dirname + '/templates/valid'
        });

        server.render('test', { title: 'test', message: 'Hapi' }, function (err, rendered, config) {

            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
            done();
        });
    });

    it('renders view (root with options)', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.views({
            engines: { html: Handlebars }
        });

        server.render('test', { title: 'test', message: 'Hapi' }, { path: Path.join(__dirname, '/templates/valid') }, function (err, rendered, config) {

            expect(rendered).to.exist();
            expect(rendered).to.contain('Hapi');
            done();
        });
    });

    it('renders view (plugin)', function (done) {

        var test = function (server, options, next) {

            server.views({
                engines: { 'html': Handlebars },
                relativeTo: Path.join(__dirname, '/templates/plugin')
            });

            var view = server.render('test', { message: 'steve' }, function (err, rendered, config) {

                server.route([
                    {
                        path: '/view', method: 'GET', handler: function (request, reply) {

                            return reply(rendered);
                        }
                    }
                ]);

                return next();
            });
        };

        test.attributes = {
            name: 'test'
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.register(test, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>steve</h1>');
                done();
            });
        });
    });

    it('renders view (plugin without views)', function (done) {

        var test = function (server, options, next) {

            var view = server.render('test', { message: 'steve' }, function (err, rendered, config) {

                server.route([
                    {
                        path: '/view', method: 'GET', handler: function (request, reply) {

                            return reply(rendered);
                        }
                    }
                ]);

                return next();
            });
        };

        test.attributes = {
            name: 'test'
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.views({
            engines: { 'html': Handlebars },
            relativeTo: Path.join(__dirname, '/templates/plugin')
        });

        server.register(test, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>steve</h1>');
                done();
            });
        });
    });

    it('renders view (plugin with options)', function (done) {

        var test = function (server, options, next) {

            server.views({
                engines: { 'html': Handlebars }
            });

            var view = server.render('test', { message: 'steve' }, { relativeTo: Path.join(__dirname, '/templates/plugin') }, function (err, rendered, config) {

                server.route([
                    {
                        path: '/view', method: 'GET', handler: function (request, reply) {

                            return reply(rendered);
                        }
                    }
                ]);

                return next();
            });
        };

        test.attributes = {
            name: 'test'
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.register(test, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>steve</h1>');
                done();
            });
        });
    });

    it('throws on missing views', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.register(Vision, Hoek.ignore);
        expect(function () {

            server.render('test');
        }).to.throw('Missing views manager');
        done();
    });
});

describe('views()', function () {

    it('requires plugin with views', function (done) {

        var test = function (server, options, next) {

            server.path(__dirname);

            var views = {
                engines: { 'html': Handlebars },
                path: './templates/plugin'
            };

            server.views(views);
            if (Object.keys(views).length !== 2) {
                return next(new Error('plugin.view() modified options'));
            }

            server.route([
                {
                    path: '/view', method: 'GET', handler: function (request, reply) {

                        return reply.view('test', { message: options.message });
                    }
                }
            ]);

            server.ext('onRequest', function (request, reply) {

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

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.register({ register: test, options: { message: 'viewing it' } }, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>viewing it</h1>');

                server.inject('/ext', function (res) {

                    expect(res.result).to.equal('<h1>grabbed</h1>');
                    done();
                });
            });
        });
    });

    it('requires plugin with views with specific relativeTo', function (done) {

        var test = function (server, options, next) {

            server.views({
                engines: { 'html': Handlebars },
                relativeTo: Path.join(__dirname, '/templates/plugin')
            });

            server.route([
                {
                    path: '/view', method: 'GET', handler: function (request, reply) {

                        return reply.view('test', { message: 'steve' });
                    }
                }
            ]);

            return next();
        };

        test.attributes = {
            name: 'test'
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.register(test, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>steve</h1>');
                done();
            });
        });
    });

    it('defaults to server views', function (done) {

        var test = function (server, options, next) {

            server.route({
                path: '/view',
                method: 'GET',
                handler: function (request, reply) {

                    return reply.view('test', { message: options.message });
                }
            });

            return next();
        };

        test.attributes = {
            name: 'test'
        };

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);

        server.path(__dirname);

        var views = {
            engines: { 'html': Handlebars },
            path: './templates/plugin'
        };

        server.views(views);

        server.register({ register: test, options: { message: 'viewing it' } }, function (err) {

            expect(err).to.not.exist();
            server.inject('/view', function (res) {

                expect(res.result).to.equal('<h1>viewing it</h1>');
                done();
            });
        });
    });

    it('throws on multiple views', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.register(Vision, Hoek.ignore);
        server.views({ engines: { 'html': Handlebars } });
        expect(function () {

            server.views({ engines: { 'html': Handlebars } });
        }).to.throw('Cannot set views manager more than once');
        done();
    });
});
