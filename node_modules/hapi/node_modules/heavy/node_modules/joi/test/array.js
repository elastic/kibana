// Load modules

var Lab = require('lab');
var Code = require('code');
var Joi = require('../lib');
var Helper = require('./helper');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('array', function () {

    it('converts a string to an array', function (done) {

        Joi.array().validate('[1,2,3]', function (err, value) {

            expect(err).to.not.exist();
            expect(value.length).to.equal(3);
            done();
        });
    });

    it('errors on non-array string', function (done) {

        Joi.array().validate('{ "something": false }', function (err, value) {

            expect(err).to.exist();
            expect(err.message).to.equal('value must be an array');
            done();
        });
    });

    it('errors on number', function (done) {

        Joi.array().validate(3, function (err, value) {

            expect(err).to.exist();
            expect(value).to.equal(3);
            done();
        });
    });

    it('converts a non-array string with number type', function (done) {

        Joi.array().validate('3', function (err, value) {

            expect(err).to.exist();
            expect(value).to.equal('3');
            done();
        });
    });

    it('errors on a non-array string', function (done) {

        Joi.array().validate('asdf', function (err, value) {

            expect(err).to.exist();
            expect(value).to.equal('asdf');
            done();
        });
    });

    describe('#includes', function () {

        it('converts members', function (done) {

            var schema = Joi.array().includes(Joi.number());
            var input = ['1', '2', '3'];
            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.deep.equal([1, 2, 3]);
                done();
            });
        });

        it('allows zero size', function (done) {

            var schema = Joi.object({
                test: Joi.array().includes(Joi.object({
                    foo: Joi.string().required()
                }))
            });
            var input = { test: [] };

            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('returns the first error when only one inclusion', function (done) {

            var schema = Joi.object({
                test: Joi.array().includes(Joi.object({
                    foo: Joi.string().required()
                }))
            });
            var input = { test: [{ foo: 'a' }, { bar: 2 }] };

            schema.validate(input, function (err, value) {

                expect(err.message).to.equal('test at position 1 fails because foo is required');
                done();
            });
        });

        it('validates multiple types added in two calls', function (done) {

            var schema = Joi.array()
                .includes(Joi.number())
                .includes(Joi.string());

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [[1, 'a', 5, 10], true],
                [['joi', 'everydaylowprices', 5000], true]
            ], done);
        });
    });

    describe('#min', function () {

        it('validates array size', function (done) {

            var schema = Joi.array().min(2);
            Helper.validate(schema, [
                [[1, 2], true],
                [[1], false]
            ], done);
        });

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.array().min('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.array().min(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });
    });

    describe('#max', function () {

        it('validates array size', function (done) {

            var schema = Joi.array().max(1);
            Helper.validate(schema, [
                [[1, 2], false],
                [[1], true]
            ], done);
        });

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.array().max('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.array().max(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });
    });

    describe('#length', function () {

        it('validates array size', function (done) {

            var schema = Joi.array().length(2);
            Helper.validate(schema, [
                [[1, 2], true],
                [[1], false]
            ], done);
        });

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.array().length('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.array().length(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });
    });

    describe('#validate', function () {

        it('should, by default, allow undefined, allow empty array', function (done) {

            Helper.validate(Joi.array(), [
                [undefined, true],
                [[], true]
            ], done);
        });

        it('should, when .required(), deny undefined', function (done) {

            Helper.validate(Joi.array().required(), [
                [undefined, false]
            ], done);
        });

        it('allows empty arrays', function (done) {

            Helper.validate(Joi.array(), [
                [undefined, true],
                [[], true]
            ], done);
        });

        it('excludes values when excludes is called', function (done) {

            Helper.validate(Joi.array().excludes(Joi.string()), [
                [['2', '1'], false],
                [['1'], false],
                [[2], true]
            ], done);
        });

        it('allows types to be excluded', function (done) {

            var schema = Joi.array().excludes(Joi.number());

            var n = [1, 2, 'hippo'];
            schema.validate(n, function (err, value) {

                expect(err).to.exist();

                var m = ['x', 'y', 'z'];
                schema.validate(m, function (err2, value) {

                    expect(err2).to.not.exist();
                    done();
                });
            });
        });

        it('validates array of Numbers', function (done) {

            Helper.validate(Joi.array().includes(Joi.number()), [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [['a', 1, 2], false],
                [['1', '2', 4], true]
            ], done);
        });

        it('validates array of mixed Numbers & Strings', function (done) {

            Helper.validate(Joi.array().includes(Joi.number(), Joi.string()), [
                [[1, 2, 3], true],
                [[50, 100, 1000], true],
                [[1, 'a', 5, 10], true],
                [['joi', 'everydaylowprices', 5000], true]
            ], done);
        });

        it('validates array of objects with schema', function (done) {

            Helper.validate(Joi.array().includes(Joi.object({ h1: Joi.number().required() })), [
                [[{ h1: 1 }, { h1: 2 }, { h1: 3 }], true],
                [[{ h2: 1, h3: 'somestring' }, { h1: 2 }, { h1: 3 }], false],
                [[1, 2, [1]], false]
            ], done);
        });

        it('errors on array of unallowed mixed types (Array)', function (done) {

            Helper.validate(Joi.array().includes(Joi.number()), [
                [[1, 2, 3], true],
                [[1, 2, [1]], false]
            ], done);
        });

        it('errors on invalid number rule using includes', function (done) {

            var schema = Joi.object({
                arr: Joi.array().includes(Joi.number().integer())
            });

            var input = { arr: [1, 2, 2.1] };
            schema.validate(input, function (err, value) {

                expect(err).to.exist();
                expect(err.message).to.equal('arr at position 2 fails because 2 must be an integer');
                done();
            });
        });

        it('validates an array within an object', function (done) {

            var schema = Joi.object({
                array: Joi.array().includes(Joi.string().min(5), Joi.number().min(3))
            }).options({ convert: false });

            Helper.validate(schema, [
                [{ array: ['12345'] }, true],
                [{ array: ['1'] }, false],
                [{ array: [3] }, true],
                [{ array: ['12345', 3] }, true]
            ], done);
        });

        it('should not change original value', function (done) {

            var schema = Joi.array().includes(Joi.number()).unique();
            var input = ['1', '2'];

            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.deep.equal([1, 2]);
                expect(input).to.deep.equal(['1', '2']);
                done();
            });
        });

        describe('#describe', function () {

            it('returns an empty description when no rules are applied', function (done) {

                var schema = Joi.array();
                var desc = schema.describe();
                expect(desc).to.deep.equal({
                    type: 'array',
                    flags: { sparse: false }
                });
                done();
            });

            it('returns an updated description when sparse rule is applied', function (done) {

                var schema = Joi.array().sparse();
                var desc = schema.describe();
                expect(desc).to.deep.equal({
                    type: 'array',
                    flags: { sparse: true }
                });
                done();
            });

            it('returns an includes array only if includes are specified', function (done) {

                var schema = Joi.array().includes().max(5);
                var desc = schema.describe();
                expect(desc.includes).to.not.exist();
                done();
            });

            it('returns a recursively defined array of includes when specified', function (done) {

                var schema = Joi.array().includes(Joi.number(), Joi.string()).excludes(Joi.boolean());
                var desc = schema.describe();
                expect(desc.includes).to.have.length(2);
                expect(desc.excludes).to.have.length(1);
                expect(desc).to.deep.equal({
                    type: 'array',
                    flags: { sparse: false },
                    includes: [{ type: 'number', invalids: [Infinity, -Infinity] }, { type: 'string', invalids: [''] }],
                    excludes: [{ type: 'boolean' }]
                });

                done();
            });
        });
    });

    describe('#unique', function() {

        it('errors if duplicate numbers, strings, objects, binaries, functions, dates and booleans', function(done) {
            var buffer = new Buffer('hello world');
            var func = function() {};
            var now = new Date();
            var schema = Joi.array().sparse().unique();

            Helper.validate(schema, [
                [[2, 2], false],
                [[02, 2], false],
                [[0x2, 2], false],
                [['duplicate', 'duplicate'], false],
                [[{ a: 'b' }, { a: 'b' }], false],
                [[buffer, buffer], false],
                [[func, func], false],
                [[now, now], false],
                [[true, true], false],
                [[undefined, undefined], false]
            ], done);
        });

        it('ignores duplicates if they are of different types', function(done) {
            var schema = Joi.array().unique();

            Helper.validate(schema, [
                [[2, '2'], true]
            ], done);
        });

        it('validates without duplicates', function(done) {
            var buffer = new Buffer('hello world');
            var buffer2 = new Buffer('Hello world');
            var func = function() {};
            var func2 = function() {};
            var now = new Date();
            var now2 = new Date(+now + 100);
            var schema = Joi.array().unique();

            Helper.validate(schema, [
                [[1, 2], true],
                [['s1', 's2'], true],
                [[{ a: 'b' }, { a: 'c' }], true],
                [[buffer, buffer2], true],
                [[func, func2], true],
                [[now, now2], true],
                [[true, false], true]
            ], done);
        });
    });

    describe('#sparse', function () {

        it('errors on undefined value', function (done) {

            var schema = Joi.array().includes(Joi.number());

            Helper.validate(schema, [
                [[undefined], false],
                [[2, undefined], false]
            ], done);
        });

        it('validates on undefined value with sparse', function (done) {

            var schema = Joi.array().includes(Joi.number()).sparse();

            Helper.validate(schema, [
                [[undefined], true],
                [[2, undefined], true]
            ], done);
        });

        it('switches the sparse flag', function (done) {

            var schema = Joi.array().sparse();
            var desc = schema.describe();
            expect(desc).to.deep.equal({
                type: 'array',
                flags: { sparse: true }
            });
            done();
        });

        it('switches the sparse flag with explicit value', function (done) {

            var schema = Joi.array().sparse(true);
            var desc = schema.describe();
            expect(desc).to.deep.equal({
                type: 'array',
                flags: { sparse: true }
            });
            done();
        });

        it('switches the sparse flag back', function (done) {

            var schema = Joi.array().sparse().sparse(false);
            var desc = schema.describe();
            expect(desc).to.deep.equal({
                type: 'array',
                flags: { sparse: false }
            });
            done();
        });
    });

    describe('#single', function() {

        it('should allow a single element', function(done) {

            var schema = Joi.array().includes(Joi.number()).excludes(Joi.boolean()).single();

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [1, true],
                [['a'], false, null, 'value at position 0 fails because value must be a number'],
                ['a', false, null, 'single value of value fails because value must be a number'],
                [true, false, null, 'single value of value contains an excluded value']
            ], done);
        });

        it('should allow a single element with multiple types', function(done) {

            var schema = Joi.array().includes(Joi.number(), Joi.string()).single();

            Helper.validate(schema, [
                [[1, 2, 3], true],
                [1, true],
                [[1, 'a'], true],
                ['a', true],
                [true, false, null, 'single value of value does not match any of the allowed types']
            ], done);
        });

        it('should allow nested arrays', function(done) {

            var schema = Joi.array().includes(Joi.array().includes(Joi.number())).single();

            Helper.validate(schema, [
                [[[1],[2],[3]], true],
                [[1, 2, 3], true],
                [[['a']], false, null, 'value at position 0 fails because value at position 0 fails because value must be a number'],
                [['a'], false, null, 'value at position 0 fails because value must be an array'],
                ['a', false, null, 'single value of value fails because value must be an array'],
                [1, false, null, 'single value of value fails because value must be an array'],
                [true, false, null, 'single value of value fails because value must be an array']
            ], done);
        });

        it('should allow nested arrays with multiple types', function (done) {

            var schema = Joi.array().includes(Joi.array().includes(Joi.number(), Joi.boolean())).single();

            Helper.validate(schema, [
                [[[1, true]], true],
                [[1, true], true],
                [[[1, 'a']], false, null, 'value at position 0 fails because value at position 1 does not match any of the allowed types'],
                [[1, 'a'], false, null, 'value at position 0 fails because value must be an array']
            ], done);
        });

        it('switches the single flag with explicit value', function (done) {

            var schema = Joi.array().single(true);
            var desc = schema.describe();
            expect(desc).to.deep.equal({
                type: 'array',
                flags: { sparse: false, single: true }
            });
            done();
        });

        it('switches the single flag back', function (done) {

            var schema = Joi.array().single().single(false);
            var desc = schema.describe();
            expect(desc).to.deep.equal({
                type: 'array',
                flags: { sparse: false, single: false }
            });
            done();
        });
    });
});
