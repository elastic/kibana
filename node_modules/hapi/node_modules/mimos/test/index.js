// Load modules

var Code = require('code');
var Hoek = require('hoek');
var Lab = require('lab');
var Mimos = require('..');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Mimos', function() {

    describe('path()', function () {

        it('returns the mime type from a file path', function (done) {

            var mimos = new Mimos();

            expect(mimos.path('/static/javascript/app.js')).deep.equal({
                source: 'iana',
                charset: 'UTF-8',
                compressible: true,
                extensions: ['js'],
                type: 'application/javascript'
            });
            done();
        });

        it('returns empty object if a match can not be found', function (done) {

            var mimos = new Mimos();

            expect(mimos.path('/static/javascript')).to.deep.equal({});
            done();
        });

        it('ignores extension upper case', function (done) {

            var lower = '/static/image/image.jpg';
            var upper = '/static/image/image.JPG';
            var mimos = new Mimos();

            expect(mimos.path(lower).type).to.equal(mimos.path(upper).type);

            done();
        });
    });

    describe('type()', function () {

        it('returns a found type', function (done) {

            var mimos = new Mimos();

            expect(mimos.type('text/plain')).to.deep.equal({
                source: 'iana',
                compressible: true,
                extensions: ['txt', 'text', 'conf', 'def', 'list', 'log', 'in', 'ini'],
                type: 'text/plain'
            });
            done();
        });

        it('returns a missing type', function (done) {

            var mimos = new Mimos();

            expect(mimos.type('hapi/test')).to.deep.equal({
                source: 'mimos',
                compressible: false,
                extensions: [],
                type: 'hapi/test'
            });
            done();
        });
    });

    it('accepts an override object to make adjustments to the internal mime database', function (done) {

        var nodeModule = {
            source: 'iana',
            compressible: false,
            extensions: ['node', 'module', 'npm'],
            type: 'node/module'
        };
        var dbOverwrite = {
            override: {
                'node/module': nodeModule
            }
        };

        var mimos = new Mimos(dbOverwrite);
        expect(mimos.type('node/module')).to.deep.equal(nodeModule);
        expect(mimos.path('/node_modules/node/module.npm')).to.deep.equal(nodeModule);

        done();
    });

    it('allows built-in types to be replaced with user mime data', function (done) {

        var jsModule = {
            source: 'iana',
            charset: 'UTF-8',
            compressible: true,
            extensions: [ 'js', 'javascript' ],
            type: 'text/javascript'
        };
        var dbOverwrite = {
            override: {
                'application/javascript': jsModule
            }
        };

        var mimos = new Mimos(dbOverwrite);

        expect(mimos.type('application/javascript')).to.deep.equal(jsModule);
        expect(mimos.path('/static/js/app.js')).to.deep.equal(jsModule);

        done();
    });

    it('executes a predicate function if it is provided', function (done) {

        var jsModule = {
            predicate: function (mime) {

                return {
                    foo: 'bar',
                    type: mime.type
                }
            },
            type: 'text/javascript'
        };
        var dbOverwrite = {
            override: {
                'application/javascript': jsModule
            }
        };

        var mimos = new Mimos(dbOverwrite);

        var typeResult = mimos.type('application/javascript');

        expect(typeResult).to.deep.equal({
            foo: 'bar',
            type: 'text/javascript'
        });

        var pathResult = mimos.path('/static/js/app.js');

        expect(pathResult).to.deep.equal({
            foo: 'bar',
            type: 'text/javascript'
        });

        done();
    });

    it('throws an error if created without new', function (done) {

        expect(function () {

            var mimos = Mimos();
        }).to.throw('Mimos must be created with new');
        done();

    });

    it('throws an error if the predicate option is not a functino', function (done) {

        expect(function () {

            var mimos = new Mimos({
                override: {
                    'application/javascript': {
                        predicate: 'foo'
                    }
                }
            });
        }).to.throw('predicate option must be a function');
        done();
    });
});
