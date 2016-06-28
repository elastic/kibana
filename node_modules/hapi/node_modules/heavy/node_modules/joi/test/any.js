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


describe('any', function () {

    describe('#equal', function () {

        it('validates valid values', function (done) {

            Helper.validate(Joi.equal(4), [
                [4, true],
                [5, false]
            ], done);
        });
    });

    describe('#not', function () {

        it('validates invalid values', function (done) {

            Helper.validate(Joi.not(5), [
                [4, true],
                [5, false]
            ], done);
        });
    });

    describe('#exist', function () {

        it('validates required values', function (done) {

            Helper.validate(Joi.exist(), [
                [4, true],
                [undefined, false]
            ], done);
        });
    });

    describe('#strict', function () {

        it('validates without converting', function (done) {

            var schema = Joi.object({
                array: Joi.array().includes(Joi.string().min(5), Joi.number().min(3))
            }).strict();

            Helper.validate(schema, [
                [{ array: ['12345'] }, true],
                [{ array: ['1'] }, false],
                [{ array: [3] }, true],
                [{ array: ['12345', 3] }, true]
            ], done);
        });
    });

    describe('#options', function () {

        it('adds to existing options', function (done) {

            var schema = Joi.object({ b: Joi.number().strict().options({ convert: true }) });
            var input = { b: '2' };
            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                expect(value.b).to.equal(2);
                done();
            });
        });
    });

    describe('#label', function () {

        it('adds to existing options', function (done) {

            var schema = Joi.object({ b: Joi.string().email().label('Custom label') });
            var input = { b: 'not_a_valid_email' };
            schema.validate(input, function (err, value) {

                expect(err).to.exist();
                expect(err.details[0].message).to.equal('Custom label must be a valid email');
                done();
            });
        });

        it('throws when label is missing', function (done) {

            expect(function () {

                Joi.label();
            }).to.throw('Label name must be a non-empty string');
            done();
        });

        it('can describe a label', function (done) {

            var schema = Joi.object().label('lbl').describe();
            expect(schema).to.deep.equal({ type: 'object', label: 'lbl' });
            done();
        });
    });

    describe('#strict', function () {

        it('adds to existing options', function (done) {

            var schema = Joi.object({ b: Joi.number().options({ convert: true }).strict() });
            var input = { b: '2' };
            schema.validate(input, function (err, value) {

                expect(err).to.exist();
                expect(value.b).to.equal('2');
                done();
            });
        });
    });

    describe('#raw', function () {

        it('gives the raw input', function (done) {

            var tests = [
                [Joi.array(), '[1,2,3]'],
                [Joi.binary(), 'abc'],
                [Joi.boolean(), 'false'],
                [Joi.date().format('YYYYMMDD'), '19700101'],
                [Joi.number(), '12'],
                [Joi.object(), '{ "a": 1 }'],
                [Joi.any().strict(), 'abc']
            ];

            tests.forEach(function (test) {

                var baseSchema = test[0];
                var input = test[1];
                var schemas = [
                    baseSchema.raw(),
                    baseSchema.raw(true),
                    baseSchema.options({ raw: true })
                ];

                schemas.forEach(function (schema) {

                    schema.raw().validate(input, function (err, value) {

                        expect(err).to.not.exist();
                        expect(value).to.equal(input);
                    });
                });
            });

            done();
        });
    });

    describe('#default', function () {

        it('sets the value', function (done) {

            var schema = Joi.object({ foo: Joi.string().default('test') });
            var input = {};

            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                expect(value.foo).to.equal('test');
                done();
            });
        });

        it('should not overide a value when value is given', function (done) {

            var schema = Joi.object({ foo: Joi.string().default('bar') });
            var input = { foo: 'test' };

            schema.validate(input, function (err, value) {

                expect(err).to.not.exist();
                expect(value.foo).to.equal('test');
                done();
            });
        });

        it('sets value based on condition (outer)', function (done) {

            var schema = Joi.object({
                a: Joi.boolean(),
                b: Joi.boolean().default(false).when('a', { is: true, then: Joi.required(), otherwise: Joi.forbidden() })
            });

            schema.validate({ a: false }, function (err, value) {

                expect(err).to.not.exist();
                expect(value.b).to.equal(false);
                done();
            });
        });

        it('sets value based on condition (inner)', function (done) {

            var schema = Joi.object({
                a: Joi.boolean(),
                b: Joi.boolean().when('a', { is: true, then: Joi.default(false), otherwise: Joi.forbidden() })
            });

            schema.validate({ a: true }, function (err, value) {

                expect(err).to.not.exist();
                expect(value.b).to.equal(false);
                done();
            });
        });
    });

    describe('#optional', function () {

        it('validates optional with default required', function (done) {

            var schema = Joi.object({
                a: Joi.any(),
                b: Joi.any(),
                c: {
                    d: Joi.any()
                }
            }).options({ presence: 'required' });

            Helper.validate(schema, [
                [{ a: 5 }, false],
                [{ a: 5, b: 6 }, false],
                [{ a: 5, b: 6, c: {} }, false],
                [{ a: 5, b: 6, c: { d: 7 } }, true],
                [{}, false],
                [{ b: 5 }, false]
            ], done);
        });
    });

    describe('#forbidden', function () {

        it('validates forbidden', function (done) {

            var schema = {
                a: Joi.number(),
                b: Joi.forbidden()
            };

            Helper.validate(schema, [
                [{ a: 5 }, true],
                [{ a: 5, b: 6 }, false],
                [{ a: 'a' }, false],
                [{}, true],
                [{ b: undefined }, true],
                [{ b: null }, false]
            ], done);
        });
    });

    describe('#description', function () {

        it('sets the description', function (done) {

            var b = Joi.description('my description');
            expect(b._description).to.equal('my description');
            done();
        });

        it('throws when description is missing', function (done) {

            expect(function () {

                Joi.description();
            }).to.throw('Description must be a non-empty string');
            done();
        });
    });

    describe('#notes', function () {

        it('sets the notes', function (done) {

            var b = Joi.notes(['a']).notes('my notes');
            expect(b._notes).to.deep.equal(['a', 'my notes']);
            done();
        });

        it('throws when notes are missing', function (done) {

            expect(function () {

                Joi.notes();
            }).to.throw('Notes must be a non-empty string or array');
            done();
        });

        it('throws when notes are invalid', function (done) {

            expect(function () {

                Joi.notes(5);
            }).to.throw('Notes must be a non-empty string or array');
            done();
        });
    });

    describe('#tags', function () {

        it('sets the tags', function (done) {

            var b = Joi.tags(['tag1', 'tag2']).tags('tag3');
            expect(b._tags).to.include('tag1');
            expect(b._tags).to.include('tag2');
            expect(b._tags).to.include('tag3');
            done();
        });

        it('throws when tags are missing', function (done) {

            expect(function () {

                Joi.tags();
            }).to.throw('Tags must be a non-empty string or array');
            done();
        });

        it('throws when tags are invalid', function (done) {

            expect(function () {

                Joi.tags(5);
            }).to.throw('Tags must be a non-empty string or array');
            done();
        });
    });

    describe('#meta', function () {

        it('sets the meta', function (done) {

            var meta = { prop: 'val', prop2: 3 };
            var b = Joi.meta(meta);
            expect(b.describe().meta).to.deep.equal([meta]);

            b = b.meta({ other: true });
            expect(b.describe().meta).to.deep.equal([meta, {
                other: true
            }]);

            done();
        });

        it('throws when meta is missing', function (done) {

            expect(function () {

                Joi.meta();
            }).to.throw('Meta cannot be undefined');
            done();
        });
    });

    describe('#example', function () {

        it('sets an example', function (done) {

            var schema = Joi.valid(5, 6, 7).example(5);
            expect(schema._examples).to.include(5);
            expect(schema.describe().examples).to.deep.equal([5]);
            done();
        });

        it('throws when tags are missing', function (done) {

            expect(function () {

                Joi.example();
            }).to.throw('Missing example');
            done();
        });

        it('throws when example fails own rules', function (done) {

            expect(function () {

                var schema = Joi.valid(5, 6, 7).example(4);
            }).to.throw('Bad example: value must be one of 5, 6, 7');
            done();
        });
    });

    describe('#unit', function () {

        it('sets the unit', function (done) {

            var b = Joi.unit('milliseconds');
            expect(b._unit).to.equal('milliseconds');
            expect(b.describe().unit).to.equal('milliseconds');
            done();
        });

        it('throws when unit is missing', function (done) {

            expect(function () {

                Joi.unit();
            }).to.throw('Unit name must be a non-empty string');
            done();
        });
    });

    describe('#_validate', function () {

        it('checks value after conversion', function (done) {

            var schema = Joi.number().invalid(2);
            Joi.validate('2', schema, { abortEarly: false }, function (err, value) {

                expect(err).to.exist();
                done();
            });
        });
    });

    describe('#concat', function () {

        it('throws when schema is not any', function (done) {

            expect(function () {

                Joi.string().concat(Joi.number());
            }).to.throw('Cannot merge with another type: number');
            done();
        });

        it('throws when schema is missing', function (done) {

            expect(function () {

                Joi.string().concat();
            }).to.throw('Invalid schema object');
            done();
        });

        it('throws when schema is invalid', function (done) {

            expect(function () {

                Joi.string().concat(1);
            }).to.throw('Invalid schema object');
            done();
        });

        it('merges two schemas (settings)', function (done) {

            var a = Joi.number().options({ convert: true });
            var b = Joi.options({ convert: false });

            Helper.validate(a, [
                [1, true], ['1', true]
            ]);

            Helper.validate(a.concat(b), [
                [1, true], ['1', false]
            ], done);
        });

        it('merges two schemas (valid)', function (done) {

            var a = Joi.string().valid('a');
            var b = Joi.string().valid('b');

            Helper.validate(a, [
                ['a', true],
                ['b', false]
            ]);

            Helper.validate(b, [
                ['b', true],
                ['a', false]
            ]);

            Helper.validate(a.concat(b), [
                ['a', true],
                ['b', true]
            ], done);
        });

        it('merges two schemas (invalid)', function (done) {

            var a = Joi.string().invalid('a');
            var b = Joi.invalid('b');

            Helper.validate(a, [
                ['b', true], ['a', false]
            ]);

            Helper.validate(b, [
                ['a', true], ['b', false]
            ]);

            Helper.validate(a.concat(b), [
                ['a', false], ['b', false]
            ], done);
        });

        it('merges two schemas (valid/invalid)', function (done) {

            var a = Joi.string().valid('a').invalid('b');
            var b = Joi.string().valid('b').invalid('a');

            Helper.validate(a, [
                ['a', true],
                ['b', false]
            ]);

            Helper.validate(b, [
                ['b', true],
                ['a', false]
            ]);

            Helper.validate(a.concat(b), [
                ['a', false],
                ['b', true]
            ], done);
        });

        it('merges two schemas (tests)', function (done) {

            var a = Joi.number().min(5);
            var b = Joi.number().max(10);

            Helper.validate(a, [
                [4, false], [11, true]
            ]);

            Helper.validate(b, [
                [6, true], [11, false]
            ]);

            Helper.validate(a.concat(b), [
                [4, false], [6, true], [11, false]
            ], done);
        });

        it('merges two schemas (flags)', function (done) {

            var a = Joi.string().valid('a');
            var b = Joi.string().insensitive();

            Helper.validate(a, [
                ['a', true], ['A', false], ['b', false]
            ]);

            Helper.validate(a.concat(b), [
                ['a', true], ['A', true], ['b', false]
            ], done);
        });

        it('overrides and append information', function (done) {

            var a = Joi.description('a').unit('a').tags('a').example('a');
            var b = Joi.description('b').unit('b').tags('b').example('b');

            var desc = a.concat(b).describe();
            expect(desc).to.deep.equal({
                type: 'any',
                description: 'b',
                tags: ['a', 'b'],
                examples: ['a', 'b'],
                unit: 'b'
            });
            done();
        });

        it('merges two objects (any key + specific key)', function (done) {

            var a = Joi.object();
            var b = Joi.object({ b: 1 });

            Helper.validate(a, [
                [{ b: 1 }, true], [{ b: 2 }, true]
            ]);

            Helper.validate(b, [
                [{ b: 1 }, true], [{ b: 2 }, false]
            ]);

            Helper.validate(a.concat(b), [
                [{ b: 1 }, true], [{ b: 2 }, false]
            ]);

            Helper.validate(b.concat(a), [
                [{ b: 1 }, true], [{ b: 2 }, false]
            ], done);
        });

        it('merges two objects (no key + any key)', function (done) {

            var a = Joi.object({});
            var b = Joi.object();

            Helper.validate(a, [
                [{}, true], [{ b: 2 }, false]
            ]);

            Helper.validate(b, [
                [{}, true], [{ b: 2 }, true]
            ]);

            Helper.validate(a.concat(b), [
                [{}, true], [{ b: 2 }, false]
            ]);

            Helper.validate(b.concat(a), [
                [{}, true], [{ b: 2 }, false]
            ], done);
        });

        it('merges two objects (key + key)', function (done) {

            var a = Joi.object({ a: 1 });
            var b = Joi.object({ b: 2 });

            Helper.validate(a, [
                [{ a: 1 }, true], [{ b: 2 }, false]
            ]);

            Helper.validate(b, [
                [{ a: 1 }, false], [{ b: 2 }, true]
            ]);

            Helper.validate(a.concat(b), [
                [{ a: 1 }, true], [{ b: 2 }, true]
            ]);

            Helper.validate(b.concat(a), [
                [{ a: 1 }, true], [{ b: 2 }, true]
            ], done);
        });

        it('merges two objects (renames)', function (done) {

            var a = Joi.object({ a: 1 }).rename('c', 'a');
            var b = Joi.object({ b: 2 }).rename('d', 'b');

            a.concat(b).validate({ c: 1, d: 2 }, function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.deep.equal({ a: 1, b: 2 });
                done();
            });
        });

        it('merges two objects (deps)', function (done) {

            var a = Joi.object({ a: 1 });
            var b = Joi.object({ b: 2 }).and('b', 'a');

            a.concat(b).validate({ a: 1, b: 2 }, function (err, value) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('merges two alternatives with references', function (done) {

            var schema = {
                a: { c: Joi.number() },
                b: Joi.alternatives(Joi.ref('a.c')).concat(Joi.alternatives(Joi.ref('c'))),
                c: Joi.number()
            };

            Helper.validate(schema, [
                [{ a: {} }, true],
                [{ a: { c: '5' }, b: 5 }, true],
                [{ a: { c: '5' }, b: 6, c: '6' }, true],
                [{ a: { c: '5' }, b: 7, c: '6' }, false]
            ], done);
        });

        it('merges meta properly', function (done) {

            var metaA = { a: 1 };
            var metaB = { b: 1 };
            var a = Joi.any().meta(metaA);
            var b = Joi.any().meta(metaB);
            var c = Joi.any();
            var d = Joi.any();

            expect(a.concat(b)._meta).to.deep.equal([{ a: 1 }, { b: 1 }]);
            expect(a.concat(c)._meta).to.deep.equal([metaA]);
            expect(b.concat(c)._meta).to.deep.equal([metaB]);
            expect(c.concat(d)._meta).to.deep.equal([]);

            done();
        });
    });

    describe('#when', function () {

        it('throws when options are invalid', function (done) {

            expect(function () {

                Joi.when('a');
            }).to.throw('Invalid options');
            done();
        });

        it('forks type into alternatives', function (done) {

            var schema = {
                a: Joi.any(),
                b: Joi.string().valid('x').when('a', { is: 5, then: Joi.valid('y'), otherwise: Joi.valid('z') })
            };

            Helper.validate(schema, [
                [{ a: 5, b: 'x' }, true],
                [{ a: 5, b: 'y' }, true],
                [{ a: 5, b: 'z' }, false],
                [{ a: 1, b: 'x' }, true],
                [{ a: 1, b: 'y' }, false],
                [{ a: 1, b: 'z' }, true],
                [{ a: 5, b: 'a' }, false],
                [{ b: 'a' }, false]
            ], done);
        });

        it('forks type into alternatives (only then)', function (done) {

            var schema = {
                a: Joi.any(),
                b: Joi.string().valid('x').when('a', { is: 5, then: Joi.valid('y') })
            };

            Helper.validate(schema, [
                [{ a: 5, b: 'x' }, true],
                [{ a: 5, b: 'y' }, true],
                [{ a: 5, b: 'z' }, false],
                [{ a: 1, b: 'x' }, true],
                [{ a: 1, b: 'y' }, false],
                [{ a: 1, b: 'z' }, false],
                [{ a: 5, b: 'a' }, false],
                [{ b: 'a' }, false]
            ], done);
        });

        it('forks type into alternatives (only otherwise)', function (done) {

            var schema = {
                a: Joi.any(),
                b: Joi.string().valid('x').when('a', { is: 5, otherwise: Joi.valid('z') })
            };

            Helper.validate(schema, [
                [{ a: 5, b: 'x' }, true],
                [{ a: 5, b: 'y' }, false],
                [{ a: 5, b: 'z' }, false],
                [{ a: 1, b: 'x' }, true],
                [{ a: 1, b: 'y' }, false],
                [{ a: 1, b: 'z' }, true],
                [{ a: 5, b: 'a' }, false],
                [{ b: 'a' }, false]
            ], done);
        });

        it('makes peer required', function (done) {

            var schema = {
                a: Joi.when('b', { is: 5, then: Joi.required() }),
                b: Joi.any()
            };

            Helper.validate(schema, [
                [{ b: 5 }, false],
                [{ b: 6 }, true],
                [{ a: 'b' }, true],
                [{ b: 5, a: 'x' }, true]
            ], done)
        });
    });

    describe('#requiredKeys', function () {

        it('should set keys as required', function (done) {

            var schema = Joi.object({ a: 0, b: 0, c: { d: 0, e: { f: 0 } }, g: { h: 0 } })
                .requiredKeys('a', 'b', 'c.d', 'c.e.f', 'g');
            Helper.validate(schema, [
                [{}, false],
                [{ a: 0 }, false],
                [{ a: 0, b: 0 }, false],
                [{ a: 0, b: 0, g: {} }, true],
                [{ a: 0, b: 0, c: {}, g: {} }, false],
                [{ a: 0, b: 0, c: { d: 0 }, g: {} }, true],
                [{ a: 0, b: 0, c: { d: 0, e: {} }, g: {} }, false],
                [{ a: 0, b: 0, c: { d: 0, e: { f: 0 } }, g: {} }, true]
            ], done);
        });

        it('should work on types other than objects', function (done) {

            var schemas = [Joi.array(), Joi.binary(), Joi.boolean(), Joi.date(), Joi.func(), Joi.number(), Joi.string()];
            schemas.forEach(function (schema) {

                expect(function () {

                    schema.applyFunctionToChildren([''], 'required');
                }).to.not.throw();

                expect(function () {

                    schema.applyFunctionToChildren(['', 'a'], 'required');
                }).to.throw();

                expect(function () {

                    schema.applyFunctionToChildren(['a'], 'required');
                }).to.throw();
            });

            done();
        });

        it('should throw on unknown key', function (done) {

            expect(function() {
                Joi.object({ a: 0, b: 0 }).requiredKeys('a', 'c', 'b', 'd', 'd.e.f');
            }).to.throw(Error, 'unknown key(s) c, d');
            expect(function() {
                Joi.object({ a: 0, b: 0 }).requiredKeys('a', 'b', 'a.c.d');
            }).to.throw(Error, 'unknown key(s) a.c.d');
            done();
        });

        it('should throw on empty object', function (done) {

            expect(function() {
                Joi.object().requiredKeys('a', 'c', 'b', 'd');
            }).to.throw(Error, 'unknown key(s) a, b, c, d');
            done();
        });

        it('should not modify original object', function (done) {

            var schema = Joi.object({ a: 0 });
            var requiredSchema = schema.requiredKeys('a');
            schema.validate({}, function (err) {

                expect(err).to.not.exist();

                requiredSchema.validate({}, function (err) {

                    expect(err).to.exist();
                    done();
                });
            });
        });
    });

    describe('#optionalKeys', function () {

        it('should set keys as optional', function (done) {

            var schema = Joi.object({ a: Joi.number().required(), b: Joi.number().required() }).optionalKeys('a', 'b');
            Helper.validate(schema, [
                [{}, true],
                [{ a: 0 }, true],
                [{ a: 0, b: 0 }, true]
            ], done);
        });
    });

    describe('Set', function () {

        describe('#add', function () {

            it('throws when adding a non ref function', function (done) {

                expect(function () {

                    Joi.valid(function () { });
                }).to.throw('Value cannot be an object or function');
                done();
            });

            it('throws when adding an object function', function (done) {

                expect(function () {

                    Joi.valid({});
                }).to.throw('Value cannot be an object or function');
                done();
            });
        });

        describe('#has', function () {

            it('compares date to null', function (done) {

                var any = Joi.any().clone();
                any._valids.add(null);
                expect(any._valids.has(new Date())).to.equal(false);
                done();
            });

            it('compares buffer to null', function (done) {

                var any = Joi.any().clone();
                any._valids.add(null);
                expect(any._valids.has(new Buffer(''))).to.equal(false);
                done();
            });
        });

        describe('#values', function () {

            it('returns array', function (done) {

                var a = Joi.any().valid('x').invalid('y');
                var b = a.invalid('x');
                expect(a._valids.values().length).to.equal(1);
                expect(b._valids.values().length).to.equal(0);
                expect(a._invalids.values().length).to.equal(1);
                expect(b._invalids.values().length).to.equal(2);
                done();
            });
        });

        describe('#toString', function () {

            it('includes undefined', function (done) {

                var b = Joi.any().allow(undefined);
                expect(b._valids.toString(true)).to.equal('undefined');
                done();
            });
        });
    });
});

