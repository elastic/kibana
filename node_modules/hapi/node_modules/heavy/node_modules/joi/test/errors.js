// Load modules

var Lab = require('lab');
var Code = require('code');
var Joi = require('../lib');


// Declare internals

var internals = {};


// Test shortcuts

var lab = exports.lab = Lab.script();
var before = lab.before;
var after = lab.after;
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;


describe('errors', function () {

    it('supports custom errors when validating types', function (done) {

        var schema = Joi.object({
            email: Joi.string().email(),
            date: Joi.date(),
            alphanum: Joi.string().alphanum(),
            min: Joi.string().min(3),
            max: Joi.string().max(3),
            required: Joi.string().required(),
            xor: Joi.string(),
            renamed: Joi.string().valid('456'),
            notEmpty: Joi.string().required()
        }).rename('renamed', 'required').without('required', 'xor').without('xor', 'required');

        var input = {
            email: 'invalid-email',
            date: 'invalid-date',
            alphanum: '\b\n\f\r\t',
            min: 'ab',
            max: 'abcd',
            required: 'hello',
            xor: '123',
            renamed: '456',
            notEmpty: ''
        };

        var lang = {
            any: {
                empty: '3'
            },
            date: {
                base: '18'
            },
            string: {
                base: '13',
                min: '14',
                max: '15',
                alphanum: '16',
                email: '19'
            },
            object: {
                without: '7',
                rename: {
                    override: '11'
                }
            }
        };

        Joi.validate(input, schema, { abortEarly: false, language: lang }, function (err, value) {

            expect(err).to.exist();
            expect(err.name).to.equal('ValidationError');
            expect(err.message).to.equal('value 11. required 7. xor 7. email 19. date 18. alphanum 16. min 14. max 15. notEmpty 3');
            done();
        });
    });

    it('does not prefix with key when language uses context.key', function (done) {

        Joi.valid('sad').options({ language: { any: { allowOnly: 'my hero {{key}} is not {{valids}}' } } }).validate(5, function (err, value) {

            expect(err.message).to.equal('my hero value is not sad');
            done();
        });
    });

    it('escapes unsafe keys', function (done) {

        var schema = {
            'a()': Joi.number()
        };

        Joi.validate({ 'a()': 'x' }, schema, function (err, value) {

            expect(err.message).to.equal('a&#x28;&#x29; must be a number');

            Joi.validate({ 'b()': 'x' }, schema, function (err, value) {

                expect(err.message).to.equal('b&#x28;&#x29; is not allowed');
                done();
            });
        });
    });

    it('returns error type in validation error', function (done) {

        var input = {
            notNumber: '',
            notString: true,
            notBoolean: 9
        };

        var schema = {
            notNumber: Joi.number().required(),
            notString: Joi.string().required(),
            notBoolean: Joi.boolean().required()
        }

        Joi.validate(input, schema, { abortEarly: false }, function (err, value) {

            expect(err).to.exist();
            expect(err.details).to.have.length(3);
            expect(err.details[0].type).to.equal('number.base');
            expect(err.details[1].type).to.equal('string.base');
            expect(err.details[2].type).to.equal('boolean.base');
            done();
        });
    });

    it('returns a full path to an error value on an array (includes)', function (done) {

        var schema = Joi.array().includes(Joi.array().includes({ x: Joi.number() }));
        var input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: 'a' }]
        ];

        schema.validate(input, function (err, value) {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('1.1.x');
            done();
        });
    });

    it('returns a full path to an error value on an array (excludes)', function (done) {

        var schema = Joi.array().includes(Joi.array().excludes({ x: Joi.string() }));
        var input = [
            [{ x: 1 }],
            [{ x: 1 }, { x: 'a' }]
        ];

        schema.validate(input, function (err, value) {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('1.1');
            done();
        });
    });

    it('returns a full path to an error value on an object', function (done) {

        var schema = {
            x: Joi.array().includes({ x: Joi.number() })
        };

        var input = {
            x: [{ x: 1 }, { x: 'a' }]
        };

        Joi.validate(input, schema, function (err, value) {

            expect(err).to.exist();
            expect(err.details[0].path).to.equal('x.1.x');
            done();
        });
    });

    it('overrides root key language', function (done) {

        Joi.string().options({ language: { root: 'blah' } }).validate(4, function (err, value) {

            expect(err.message).to.equal('blah must be a string');
            done();
        });
    });

    it('overrides label key language', function (done) {

        Joi.string().options({ language: { root: 'blah', label: 'bleh' } }).validate(4, function (err, value) {

            expect(err.message).to.equal('bleh must be a string');
            done();
        });
    });

    it('provides context with the error', function (done) {

        Joi.object({ length: Joi.number().min(3).required() }).validate({ length: 1 }, function (err) {

            expect(err.details).to.deep.equal([{
                message: 'length must be larger than or equal to 3',
                path: 'length',
                type: 'number.min',
                context: {
                    limit: 3,
                    key: 'length'
                }
            }]);
            done();
        });
    });

    describe('#annotate', function () {

        it('annotates error', function (done) {

            var object = {
                a: 'm',
                y: {
                    b: {
                        c: 10
                    }
                }
            };

            var schema = {
                a: Joi.string().valid('a', 'b', 'c', 'd'),
                y: Joi.object({
                    u: Joi.string().valid(['e', 'f', 'g', 'h']).required(),
                    b: Joi.string().valid('i', 'j').allow(false),
                    d: Joi.object({
                        x: Joi.string().valid('k', 'l').required(),
                        c: Joi.number()
                    })
                })
            };

            Joi.validate(object, schema, { abortEarly: false }, function (err, value) {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"y\": {\n    \"b\" \u001b[31m[1]\u001b[0m: {\n      \"c\": 10\n    },\n    \u001b[41m\"u\"\u001b[0m\u001b[31m [2]: -- missing --\u001b[0m\n  },\n  \"a\" \u001b[31m[3]\u001b[0m: \"m\"\n}\n\u001b[31m\n[1] a must be one of a, b, c, d\n[2] u is required\n[3] b must be a string\u001b[0m');
                done();
            });
        });

        it('displays alternatives fail as a single line', function (done) {

            var schema = {
                x: [
                    Joi.string(),
                    Joi.number(),
                    Joi.date()
                ]
            };

            Joi.validate({ x: true }, schema, function (err, value) {

                expect(err).to.exist();
                expect(err.annotate()).to.equal('{\n  \"x\" \u001b[31m[1, 2, 3]\u001b[0m: true\n}\n\u001b[31m\n[1] x must be a string\n[2] x must be a number\n[3] x must be a number of milliseconds or valid date string\u001b[0m');
                done();
            });
        });
    });
});
