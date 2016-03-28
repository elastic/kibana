// Load modules

var Fs = require('fs');
var Code = require('code');
var Handlebars = require('handlebars');
var Hapi = require('hapi');
var Hoek = require('hoek');
var Jade = require('jade');
var Lab = require('lab');
var Vision = require('..');
var Manager = require('../lib/manager');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('Manager', function () {

    it('renders handlebars template', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid'
                }
            }
        });

        server.route({ method: 'GET', path: '/handlebars', handler: { view: { template: 'test.html', context: { message: 'Hello World!' } } } });

        server.inject('/handlebars', function (res) {

            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('shallow copies global context', function (done) {

        var options = {
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid'
                }
            },
            context: {
                a: 1
            }
        };

        var manager = new Manager(options);

        expect(manager._context).to.equal(options.context);
        done();
    });

    it('sets content type', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: {
                html: {
                    module: require('handlebars'),
                    path: __dirname + '/templates/valid',
                    contentType: 'something/else'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello World!' } } } });
        server.inject('/', function (res) {

            expect(res.headers['content-type']).to.equal('something/else');
            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('errors on invalid template path', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/invalid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!' } } } });
        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('returns a compiled Handlebars template reply', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.result).to.have.string('Hello, World!');
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('errors absolute path given and allowAbsolutePath is false (by default)', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: __dirname + '/templates/valid/test', context: { message: 'Hello, World!' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('errors if path given includes ../ and allowInsecureAccess is false (by default)', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: '../test', context: { message: 'Hello, World!' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('allows if path given includes ../ and allowInsecureAccess is true', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            allowInsecureAccess: true,
            path: __dirname + '/templates/valid/helpers'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: '../test', context: { message: 'Hello, World!' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.result).to.have.string('Hello, World!');
            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    it('errors if template does not exist()', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'testNope', context: { message: 'Hello, World!' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('errors if engine.compile throws', function (done) {

        var server = new Hapi.Server({ minimal: true, debug: false });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: { 'html': require('handlebars') },
            path: __dirname + '/templates/valid'
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'badmustache', context: { message: 'Hello, World!' }, options: { path: __dirname + '/templates/valid/invalid' } } } });

        server.inject('/', function (res) {

            expect(res.result).to.exist();
            expect(res.statusCode).to.equal(500);
            done();
        });
    });

    it('should not fail if rendered template returns undefined', function (done) {

        var server = new Hapi.Server({ minimal: true });
        server.connection();
        server.register(Vision, Hoek.ignore);
        server.views({
            engines: {
                html: {
                    module: {
                        compile: function (template, options) {

                            return function (context, options) {

                                return undefined;
                            };
                        }
                    },
                    path: __dirname + '/templates/valid'
                }
            }
        });

        server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.html' } } });

        server.inject('/', function (res) {

            expect(res.statusCode).to.equal(200);
            done();
        });
    });

    describe('with layout', function (done) {

        it('returns response', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
                done();
            });
        });

        it('returns response with relativeTo and absolute path', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                relativeTo: '/none/shall/pass',
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<!DOCTYPE html>\n<html>\n    <head>\n        <title>test</title>\n    </head>\n    <body>\n        <div>\n    <h1>Hapi</h1>\n</div>\n\n    </body>\n</html>\n');
                done();
            });
        });

        it('returns response with layout override', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' }, options: { layout: 'otherLayout' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('returns response with custom server layout', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'otherLayout'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test:<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('returns response with custom server layout and path', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                relativeTo: __dirname,
                path: 'templates',
                layoutPath: 'templates/layout',
                layout: 'elsewhere'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('test+<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('errors on missing layout', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'missingLayout'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('errors on invalid layout', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: 'invalidLayout'
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' } } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns response without layout', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'valid/test', context: { title: 'test', message: 'Hapi' }, options: { layout: false } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                expect(res.result).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('errors on layoutKeyword conflict', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello, World!', content: 'fail' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('errors absolute path given and allowAbsolutePath is false (by default)', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                engines: { 'html': require('handlebars') },
                path: __dirname + '/templates/valid',
                layout: true
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { title: 'test', message: 'Hapi' }, options: { path: __dirname + '/templates/valid/invalid' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('with multiple engines', function () {

        it('renders handlebars template', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'jade': require('jade'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.html', context: { message: 'Hello World!' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('renders jade template', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'jade': require('jade'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'testMulti.jade', context: { message: 'Hello World!' } } } });

            server.inject('/', function (res) {

                expect(res.result).to.exist();
                expect(res.statusCode).to.equal(200);
                done();
            });
        });

        it('returns 500 on unknown extension', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'jade': require('jade'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test', context: { message: 'Hello World!' } } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });

        it('returns 500 on missing extension engine', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.connection();
            server.register(Vision, Hoek.ignore);
            server.views({
                path: __dirname + '/templates/valid',
                engines: {
                    'html': require('handlebars'),
                    'jade': require('jade'),
                    'hbar': {
                        module: {
                            compile: function (engine) {

                                return engine.compile;
                            }
                        }
                    }
                }
            });

            server.route({ method: 'GET', path: '/', handler: { view: { template: 'test.xyz', context: { message: 'Hello World!' } } } });

            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });

    describe('render()', function () {

        it('renders with async compile', function (done) {

            var views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                var compiled = Handlebars.compile(string, options);
                                var renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                }
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('errors on sync compile that throws', function (done) {

            var views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'sync',
                        module: {
                            compile: function (string, options) {

                                throw (new Error('Bad bad view'));
                            }
                        }
                    }
                }
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist();
                expect(err.message).to.equal('Bad bad view');
                done();
            });
        });

        it('allows valid (no layouts)', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('renders without context', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates'
            });

            testView.render('valid/test', null, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.equal('<div>\n    <h1></h1>\n</div>\n');
                done();
            });
        });

        it('renders without handler/global-context (with layout)', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            testView.render('valid/test', null, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<div>\n    <h1></h1>\n</div>\n');
                done();
            });
        });

        it('renders with a global context object', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: {
                    message: 'default message',

                    query: {
                        test: 'global'
                    }
                }
            });

            testView.render('valid/testContext', null, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>global</h1>');
                expect(rendered).to.contain('<h1>default message</h1>');
                done();
            });
        });

        it('overrides the global context object with local values', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: {
                    message: 'default message',

                    query: {
                        test: 'global'
                    }
                }
            });

            testView.render('valid/testContext', { message: 'override' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>global</h1>');
                expect(rendered).to.contain('<h1>override</h1>');
                done();
            });
        });

        it('renders with a global context function', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: function () {

                    return {
                        message: 'default message',

                        query: {
                            test: 'global'
                        }
                    };
                }
            });

            testView.render('valid/testContext', null, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>global</h1>');
                expect(rendered).to.contain('<h1>default message</h1>');
                done();
            });
        });

        it('overrides the global context function values with local values', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',

                context: function () {

                    return {
                        message: 'default message',

                        query: {
                            test: 'global'
                        }
                    };
                }
            });

            testView.render('valid/testContext', { message: 'override' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>global</h1>');
                expect(rendered).to.contain('<h1>override</h1>');
                done();
            });
        });

        it('uses specified default ext', function (done) {

            var testView = new Manager({
                defaultExtension: 'html',
                engines: { html: require('handlebars'), jade: Jade },
                path: __dirname + '/templates'
            });

            testView.render('valid/test', null, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.equal('<div>\n    <h1></h1>\n</div>\n');
                done();
            });
        });

        it('allows relative path with no base', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: './test/templates',
                layout: false
            });

            testView.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.equal('<div>\n    <h1>Hapi</h1>\n</div>\n');
                done();
            });
        });

        it('allows multiple relative paths with no base', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: ['./test/templates/layout', './test/templates/valid'],
                layout: false
            });

            testView.render('test', { message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>Hapi</h1>');
                done();
            });
        });

        it('allows multiple relative paths with a base', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: ['layout', 'valid'],
                layout: false
            });

            testView.render('test', { message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>Hapi</h1>');
                done();
            });
        });

        it('uses the first matching template', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: ['valid', 'invalid'],
                layout: false
            });

            testView.render('test', { message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>Hapi</h1>');
                done();
            });
        });

        it('allows multiple absolute paths', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: [__dirname + '/templates/layout', __dirname + '/templates/valid'],
                layout: false
            });

            testView.render('test', { message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('<h1>Hapi</h1>');
                done();
            });
        });

        it('allows valid (with layouts)', function (done) {

            var testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('allows absolute path', function (done) {

            var testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: __dirname + '/templates/layout',
                allowAbsolutePaths: true
            });

            testViewWithLayouts.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('errors on invalid layout', function (done) {

            var views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: 'badlayout'
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist();
                expect(err.message).to.equal('Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'STRING\', \'NUMBER\', \'BOOLEAN\', \'UNDEFINED\', \'NULL\', \'DATA\', got \'INVALID\': Parse error on line 1:\n{{}\n--^\nExpecting \'ID\', \'STRING\', \'NUMBER\', \'BOOLEAN\', \'UNDEFINED\', \'NULL\', \'DATA\', got \'INVALID\'');
                done();
            });
        });

        it('errors on layout compile error', function (done) {

            var views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: 'layout'
            });

            var layout = __dirname + '/templates/layout.html';
            var mode = Fs.statSync(layout).mode;

            Fs.chmodSync(layout, '0300');
            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                try {
                    expect(err).to.exist();
                    expect(err.message).to.contain('Failed to read view file');
                }
                finally {
                    Fs.chmodSync(layout, mode);
                }
                done();
            });
        });

        it('errors on invalid layout path', function (done) {

            var views = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: '/badlayout'
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist();
                expect(err.message).to.equal('Absolute paths are not allowed in views');
                done();
            });
        });

        it('allows multiple layout paths', function (done) {

            var views = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname + '/templates',
                path: 'valid',
                layoutPath: ['invalid', 'layout'],
                layout: 'elsewhere'
            });

            views.render('test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).not.to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('uses the first matching layout', function (done) {

            var views = new Manager({
                engines: { html: require('handlebars') },
                relativeTo: __dirname,
                path: 'templates/valid',
                layoutPath: ['templates', 'templates/invalid'],
                layout: true
            });

            views.render('test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).not.to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('allows valid jade layouts', function (done) {

            var testViewWithJadeLayouts = new Manager({
                engines: { jade: Jade },
                path: __dirname + '/templates' + '/valid/',
                layout: true
            });

            testViewWithJadeLayouts.render('index', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('should work and not throw without jade layouts', function (done) {

            var testViewWithoutJadeLayouts = new Manager({
                engines: { jade: Jade },
                path: __dirname + '/templates' + '/valid/',
                layout: false
            });

            testViewWithoutJadeLayouts.render('test', { title: 'test', message: 'Hapi Message' }, null, function (err, rendered, config) {

                expect(rendered).to.contain('Hapi Message');
                done();
            });
        });

        it('allows relativeTo, template name, and no path', function (done) {

            var views = new Manager({ engines: { html: require('handlebars') } });
            views.render('test', { title: 'test', message: 'Hapi' }, { relativeTo: __dirname + '/templates/valid' }, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');
                done();
            });
        });

        it('errors when referencing non existant partial (with layouts)', function (done) {

            var testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            testViewWithLayouts.render('invalid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist();
                done();
            });
        });

        it('errors when referencing non existant partial (no layouts)', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('invalid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err).to.exist();
                done();
            });

        });

        it('errors if context uses layoutKeyword as a key', function (done) {

            var testViewWithLayouts = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: true
            });

            var opts = { title: 'test', message: 'Hapi', content: 1 };
            testViewWithLayouts.render('valid/test', opts, null, function (err, rendered, config) {

                expect(err).to.exist();
                done();
            });
        });

        it('errors on compile error (invalid template code)', function (done) {

            var testView = new Manager({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates',
                layout: false
            });

            testView.render('invalid/badmustache', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(err instanceof Error).to.equal(true);
                done();
            });
        });

        it('loads partials and be able to render them', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('normalizes full partial name (windows)', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials'
            });

            tempView.render('testPartialsName', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials from relative path without base', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: './test/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partals from multiple relative paths without base', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: ['./test/templates/invalid', './test/templates/valid/partials']
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partals from multiple relative paths with base', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: __dirname + '/templates',
                path: 'valid',
                partialsPath: ['invalid', 'valid/partials']
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials from multiple absolute paths', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: [__dirname + '/templates/invalid', __dirname + '/templates/valid/partials']
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials from relative path without base (no dot)', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: 'test/templates/valid/partials'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal(' Nav:<nav>Nav</nav>|<nav>Nested</nav>');
                done();
            });
        });

        it('loads partials and render them EVEN if viewsPath has trailing slash', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials/'
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered.length).above(1);
                done();
            });
        });

        it('skips loading partials and helpers if engine does not support them', function (done) {

            var tempView = new Manager({
                path: __dirname + '/templates/valid',
                partialsPath: __dirname + '/templates/valid/partials',
                helpersPath: __dirname + '/templates/valid/helpers',
                engines: { html: Jade }
            });

            tempView.render('testPartials', {}, null, function (err, rendered, config) {

                expect(rendered).to.equal('Nav:{{> nav}}|{{> nested/nav}}');
                done();
            });
        });

        it('loads helpers and render them', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers and render them when helpersPath ends with a slash', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: __dirname + '/templates/valid',
                helpersPath: __dirname + '/templates/valid/helpers/'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers using relative paths', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: './test/templates',
                path: './valid',
                helpersPath: './valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers from multiple paths without a base', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                path: './test/templates/valid',
                helpersPath: ['./test/templates/valid/helpers/tools', './test/templates/valid/helpers']
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers from multiple paths with a base', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: './test/templates',
                path: './valid',
                helpersPath: ['./valid/helpers/tools', './valid/helpers']
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('loads helpers using relative paths (without dots)', function (done) {

            var tempView = new Manager({
                engines: { html: { module: Handlebars.create() } },    // Clear environment from other tests
                relativeTo: 'test/templates',
                path: 'valid',
                helpersPath: 'valid/helpers'
            });

            tempView.render('testHelpers', { something: 'uppercase' }, null, function (err, rendered, config) {

                expect(rendered).to.equal('<p>This is all UPPERCASE and this is how we like it!</p>');
                done();
            });
        });

        it('reuses cached compilation', function (done) {

            var gen = 0;
            var views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                ++gen;
                                var compiled = Handlebars.compile(string, options);
                                var renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                }
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');

                views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                    expect(rendered).to.exist();
                    expect(rendered).to.contain('Hapi');

                    expect(gen).to.equal(1);
                    done();
                });
            });
        });

        it('disables caching', function (done) {

            var gen = 0;
            var views = new Manager({
                path: __dirname + '/templates',
                engines: {
                    html: {
                        compileMode: 'async',
                        module: {
                            compile: function (string, options, callback) {

                                ++gen;
                                var compiled = Handlebars.compile(string, options);
                                var renderer = function (context, opt, next) {

                                    return next(null, compiled(context, opt));
                                };

                                return callback(null, renderer);
                            }
                        }
                    }
                },
                isCached: false
            });

            views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                expect(rendered).to.exist();
                expect(rendered).to.contain('Hapi');

                views.render('valid/test', { title: 'test', message: 'Hapi' }, null, function (err, rendered, config) {

                    expect(rendered).to.exist();
                    expect(rendered).to.contain('Hapi');

                    expect(gen).to.equal(2);
                    done();
                });
            });
        });
    });

    describe('_response()', function () {

        it('sets Content-Type', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.register(Vision, Hoek.ignore);
            server.connection();
            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/valid'
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: 'hi' });
            };

            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.headers['content-type']).to.contain('text/html');
                done();
            });
        });

        it('does not override Content-Type', function (done) {

            var server = new Hapi.Server({ minimal: true });
            server.register(Vision, Hoek.ignore);
            server.connection();

            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/valid'
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: 'hi' }).type('text/plain');
            };

            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.headers['content-type']).to.contain('text/plain');
                done();
            });
        });

        it('errors on invalid template', function (done) {

            var server = new Hapi.Server({ minimal: true, debug: false });
            server.register(Vision, Hoek.ignore);
            server.connection();
            server.views({
                engines: { html: require('handlebars') },
                path: __dirname + '/templates/invalid'
            });

            var handler = function (request, reply) {

                return reply.view('test.html', { message: 'hi' });
            };

            server.route({ method: 'GET', path: '/', handler: handler });
            server.inject('/', function (res) {

                expect(res.statusCode).to.equal(500);
                done();
            });
        });
    });
});
