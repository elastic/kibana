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


describe('string', function () {

    it('fails on boolean', function (done) {

        var schema = Joi.string();
        Helper.validate(schema, [
            [true, false],
            [false, false]
        ], done);
    });

    describe('#valid', function () {

        it('should throw error on input not matching type', function (done) {

            expect(function () {

                Joi.string().valid({});
            }).to.throw();
            done();
        });

        it('should not throw on input matching type', function (done) {

            expect(function () {

                Joi.string().valid('joi');
            }).to.not.throw();
            done();
        });

        it('validates case sensitive values', function (done) {

            Helper.validate(Joi.string().valid('a', 'b'), [
                ['a', true],
                ['b', true],
                ['A', false],
                ['B', false]
            ], done);
        });

        it('validates case insensitive values', function (done) {

            Helper.validate(Joi.string().valid('a', 'b').insensitive(), [
                ['a', true],
                ['b', true],
                ['A', true],
                ['B', true],
                [4, false]
            ], done);
        });

        it('validates case insensitive values with non-strings', function (done) {

            Helper.validate(Joi.string().valid('a', 'b', 5).insensitive(), [
                ['a', true],
                ['b', true],
                ['A', true],
                ['B', true],
                [4, false],
                [5, true]
            ], done);
        });
    });

    describe('#invalid', function () {

        it('should throw error on input not matching type', function (done) {

            expect(function () {

                Joi.string().invalid({});
            }).to.throw();
            done();
        });

        it('should not throw on input matching type', function (done) {

            expect(function () {

                Joi.string().invalid('joi');
            }).to.not.throw();
            done();
        });

        it('invalidates case sensitive values', function (done) {

            Helper.validate(Joi.string().invalid('a', 'b'), [
                ['a', false],
                ['b', false],
                ['A', true],
                ['B', true]
            ], done);
        });

        it('invalidates case insensitive values', function (done) {

            Helper.validate(Joi.string().invalid('a', 'b').insensitive(), [
                ['a', false],
                ['b', false],
                ['A', false],
                ['B', false]
            ], done);
        });
    });

    describe('#min', function () {

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.string().min('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.string().min(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('enforces a limit using byte count', function (done) {

            var schema = Joi.string().min(2, 'utf8');
            Helper.validate(schema, [
                ['\u00bd', true],
                ['a', false]
            ], done);
        });
    });

    describe('#max', function () {

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.string().max('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.string().max(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('enforces a limit using byte count', function (done) {

            var schema = Joi.string().max(1, 'utf8');
            Helper.validate(schema, [
                ['\u00bd', false],
                ['a', true]
            ], done);
        });
    });

    describe('#creditCard', function () {

        it('should validate credit card', function (done) {

            var t = Joi.string().creditCard();
            t.validate('4111111111111112', function (err, value) {

                expect(err.message).to.equal('value must be a credit card');

                Helper.validate(t, [
                    ['378734493671000', true],  // american express
                    ['371449635398431', true],  // american express
                    ['378282246310005', true],  // american express
                    ['341111111111111', true],  // american express
                    ['5610591081018250', true], // australian bank
                    ['5019717010103742', true], // dankort pbs
                    ['38520000023237', true],   // diners club
                    ['30569309025904', true],   // diners club
                    ['6011000990139424', true], // discover
                    ['6011111111111117', true], // discover
                    ['6011601160116611', true], // discover
                    ['3566002020360505', true], // jbc
                    ['3530111333300000', true], // jbc
                    ['5105105105105100', true], // mastercard
                    ['5555555555554444', true], // mastercard
                    ['5431111111111111', true], // mastercard
                    ['6331101999990016', true], // switch/solo paymentech
                    ['4222222222222', true],    // visa
                    ['4012888888881881', true], // visa
                    ['4111111111111111', true], // visa
                    ['4111111111111112', false],
                    [null, false],
                ], done);
            });
        });
    });

    describe('#length', function () {

        it('throws when limit is not a number', function (done) {

            expect(function () {

                Joi.string().length('a');
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('throws when limit is not an integer', function (done) {

            expect(function () {

                Joi.string().length(1.2);
            }).to.throw('limit must be a positive integer');
            done();
        });

        it('enforces a limit using byte count', function (done) {

            var schema = Joi.string().length(2, 'utf8');
            Helper.validate(schema, [
                ['\u00bd', true],
                ['a', false]
            ], done);
        });
    });

    describe('#hostname', function () {

        it('validates hostnames', function (done) {

            var schema = Joi.string().hostname();
            Helper.validate(schema, [
                ['www.example.com', true],
                ['domain.local', true],
                ['3domain.local', true],
                ['hostname', true],
                ['host:name', false],
                ['-', false],
                ['2387628', true],
                ['01234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789', false],
                ['::1', true],
                ['0:0:0:0:0:0:0:1', true],
                ['0:?:0:0:0:0:0:1', false]
            ], done);
        });
    });

    describe('#lowercase', function () {

        it('only allows strings that are entirely lowercase', function (done) {

            var schema = Joi.string().lowercase();
            Helper.validateOptions(schema, [
                ['this is all lowercase', true],
                ['5', true],
                ['lower\tcase', true],
                ['Uppercase', false],
                ['MixEd cAsE', false],
                [1, false]
            ], { convert: false }, done);
        });

        it('coerce string to lowercase before validation', function (done) {

            var schema = Joi.string().lowercase();
            schema.validate('UPPER TO LOWER', function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.equal('upper to lower');
                done();
            });
        });

        it('should work in combination with a trim', function (done) {

            var schema = Joi.string().lowercase().trim();
            Helper.validate(schema, [
                [' abc', true],
                [' ABC', true],
                ['ABC', true],
                [1, false]
            ], done);
        });
    });

    describe('#uppercase', function () {

        it('only allow strings that are entirely uppercase', function (done) {

            var schema = Joi.string().uppercase();
            Helper.validateOptions(schema, [
                ['THIS IS ALL UPPERCASE', true],
                ['5', true],
                ['UPPER\nCASE', true],
                ['lOWERCASE', false],
                ['MixEd cAsE', false],
                [1, false]
            ], { convert: false }, done);
        });

        it('coerce string to uppercase before validation', function (done) {

            var schema = Joi.string().uppercase();
            schema.validate('lower to upper', function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.equal('LOWER TO UPPER');
                done();
            });
        });

        it('works in combination with a forced trim', function (done) {

            var schema = Joi.string().uppercase().trim();
            Helper.validate(schema, [
                [' abc', true],
                [' ABC', true],
                ['ABC', true],
                [1, false]
            ], done);
        });
    });

    describe('#trim', function () {

        it('only allow strings that have no leading or trailing whitespace', function (done) {

            var schema = Joi.string().trim();
            Helper.validateOptions(schema, [
                [' something', false],
                ['something ', false],
                ['something\n', false],
                ['some thing', true],
                ['something', true]
            ], { convert: false }, done);
        });

        it('removes leading and trailing whitespace before validation', function (done) {

            var schema = Joi.string().trim();
            schema.validate(' trim this ', function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.equal('trim this');
                done();
            });
        });

        it('removes leading and trailing whitespace before validation', function (done) {

            var schema = Joi.string().trim().allow('');
            schema.validate('     ', function (err, value) {

                expect(err).to.not.exist();
                expect(value).to.equal('');
                done();
            });
        });

        it('should work in combination with min', function (done) {

            var schema = Joi.string().min(4).trim();
            Helper.validate(schema, [
                [' a ', false],
                ['abc ', false],
                ['abcd ', true]
            ], done);
        });

        it('should work in combination with max', function (done) {

            var schema = Joi.string().max(4).trim();
            Helper.validate(schema, [
                [' abcde ', false],
                ['abc ', true],
                ['abcd ', true]
            ], done);
        });

        it('should work in combination with length', function (done) {

            var schema = Joi.string().length(4).trim();
            Helper.validate(schema, [
                [' ab ', false],
                ['abc ', false],
                ['abcd ', true]
            ], done);
        });

        it('should work in combination with a case change', function (done) {

            var schema = Joi.string().trim().lowercase();
            Helper.validate(schema, [
                [' abc', true],
                [' ABC', true],
                ['ABC', true]
            ], done);
        });
    });

    describe('#regex', function () {

        it('should not include a pattern name by default', function (done) {

            var schema = Joi.string().regex(/[a-z]+/).regex(/[0-9]+/);
            schema.validate('abcd', function (err, value) {

                expect(err.message).to.contain('required pattern');
                done();
            });
        });

        it('should include a pattern name if specified', function (done) {

            var schema = Joi.string().regex(/[a-z]+/, 'letters').regex(/[0-9]+/, 'numbers');
            schema.validate('abcd', function (err, value) {

                expect(err.message).to.contain('numbers pattern');
                done();
            });
        });
    });

    describe('#validate', function () {

        it('should, by default, allow undefined, deny empty string', function (done) {

            Helper.validate(Joi.string(), [
                [undefined, true],
                ['', false]
            ], done);
        });

        it('should, when .required(), deny undefined, deny empty string', function (done) {

            Helper.validate(Joi.string().required(), [
                [undefined, false],
                ['', false]
            ], done);
        });

        it('should, when .required(), print a friend error message for an empty string', function (done) {

            var schema = Joi.string().required();
            Joi.compile(schema).validate('', function (err, value) {

                expect(err.message).to.contain('be empty');
                done();
            });
        });

        it('should, when .required(), validate non-empty strings', function (done) {

            var schema = Joi.string().required();
            Helper.validate(schema, [
                ['test', true],
                ['0', true],
                [null, false]
            ], done);
        });

        it('validates invalid values', function (done) {

            var schema = Joi.string().invalid('a', 'b', 'c');
            Helper.validate(schema, [
                ['x', true],
                ['a', false],
                ['c', false]
            ], done);
        });

        it('should invalidate invalid values', function (done) {

            var schema = Joi.string().valid('a', 'b', 'c');
            Helper.validate(schema, [
                ['x', false],
                ['a', true],
                ['c', true]
            ], done);
        });

        it('validates array arguments correctly', function (done) {

            var schema = Joi.string().valid(['a', 'b', 'c']);
            Helper.validate(schema, [
                ['x', false],
                ['a', true],
                ['c', true]
            ], done);
        });

        it('validates minimum length when min is used', function (done) {

            var schema = Joi.string().min(3);
            Helper.validate(schema, [
                ['test', true],
                ['0', false],
                [null, false]
            ], done);
        });

        it('validates minimum length when min is 0', function (done) {

            var schema = Joi.string().min(0).required();
            Helper.validate(schema, [
                ['0', true],
                [null, false],
                [undefined, false]
            ], done);
        });

        it('should return false with minimum length and a null value passed in', function (done) {

            var schema = Joi.string().min(3);
            Helper.validate(schema, [
                [null, false]
            ], done);
        });

        it('null allowed overrides min length requirement', function (done) {

            var schema = Joi.string().min(3).allow(null);
            Helper.validate(schema, [
                [null, true]
            ], done);
        });

        it('validates maximum length when max is used', function (done) {

            var schema = Joi.string().max(3);
            Helper.validate(schema, [
                ['test', false],
                ['0', true],
                [null, false]
            ], done);
        });

        it('should return true with max and not required when value is undefined', function (done) {

            var schema = Joi.string().max(3);
            Helper.validate(schema, [
                [undefined, true]
            ], done);
        });

        it('validates length requirements', function (done) {

            var schema = Joi.string().length(3);
            Helper.validate(schema, [
                ['test', false],
                ['0', false],
                [null, false],
                ['abc', true]
            ], done);
        });

        it('validates regex', function (done) {

            var schema = Joi.string().regex(/^[0-9][-][a-z]+$/);
            Helper.validate(schema, [
                ['van', false],
                ['0-www', true]
            ], done);
        });

        it('validates regex (ignoring global flag)', function (done) {

            var schema = Joi.string().regex(/a/g);
            Helper.validate(schema, [
                ['ab', true],
                ['ac', true]
            ], done);
        });

        it('validates token', function (done) {

            var schema = Joi.string().token();
            Helper.validate(schema, [
                ['w0rld_of_w4lm4rtl4bs', true],
                ['w0rld of_w4lm4rtl4bs', false],
                ['abcd#f?h1j orly?', false]
            ], done);
        });

        it('validates alphanum', function (done) {

            var schema = Joi.string().alphanum();
            Helper.validate(schema, [
                ['w0rld of w4lm4rtl4bs', false],
                ['w0rldofw4lm4rtl4bs', true],
                ['abcd#f?h1j orly?', false]
            ], done);
        });

        it('validates email', function (done) {

            var schema = Joi.string().email();
            Helper.validate(schema, [
                ['joe@example.com', true],
                ['"joe"@example.com', true],
                ['@iaminvalid.com', false],
                ['joe@[IPv6:2a00:1450:4001:c02::1b]', true],
                ['12345678901234567890123456789012345678901234567890123456789012345@walmartlabs.com', false],
                ['123456789012345678901234567890123456789012345678901234567890@12345678901234567890123456789012345678901234567890123456789.12345678901234567890123456789012345678901234567890123456789.12345678901234567890123456789012345678901234567890123456789.12345.toolong.com', false]
            ], done);
        });

        it('validates email with a friendly error message', function (done) {

            var schema = { item: Joi.string().email() };
            Joi.compile(schema).validate({ item: 'something' }, function (err, value) {

                expect(err.message).to.contain('must be a valid email');
                done();
            });
        });

        it('should return false for denied value', function (done) {

            var text = Joi.string().invalid('joi');
            text.validate('joi', function (err, value) {

                expect(err).to.exist();
                done();
            });
        });

        it('should return true for allowed value', function (done) {

            var text = Joi.string().allow('hapi');
            text.validate('result', function (err, value) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('validates with one validator (min)', function (done) {

            var text = Joi.string().min(3);
            text.validate('joi', function (err, value) {

                expect(err).to.not.exist();
                done();
            });
        });

        it('validates with two validators (min, required)', function (done) {

            var text = Joi.string().min(3).required();
            text.validate('joi', function (err, value) {

                expect(err).to.not.exist();

                text.validate('', function (err, value) {

                    expect(err).to.exist();
                    done();
                });
            });
        });

        it('validates null with allow(null)', function (done) {

            Helper.validate(Joi.string().allow(null), [
                [null, true]
            ], done);
        });

        it('validates "" (empty string) with allow(\'\')', function (done) {

            Helper.validate(Joi.string().allow(''), [
                ['', true],
                ['', true]
            ], done);
        });

        it('validates combination of required and min', function (done) {

            var rule = Joi.string().required().min(3);
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of required and max', function (done) {

            var rule = Joi.string().required().max(3);
            Helper.validate(rule, [
                ['x', true],
                ['123', true],
                ['1234', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of allow(\'\') and min', function (done) {

            var rule = Joi.string().allow('').min(3);
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', true],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of allow(\'\') and max', function (done) {

            var rule = Joi.string().allow('').max(3);
            Helper.validate(rule, [
                ['x', true],
                ['123', true],
                ['1234', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of null allowed and max', function (done) {
            var rule = Joi.string().allow(null).max(3);
            Helper.validate(rule, [
                ['x', true],
                ['123', true],
                ['1234', false],
                ['', false],
                [null, true]
            ], done);
        });

        it('validates combination of min and max', function (done) {

            var rule = Joi.string().min(2).max(3);
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, and allow(\'\')', function (done) {

            var rule = Joi.string().min(2).max(3).allow('');
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, and required', function (done) {

            var rule = Joi.string().min(2).max(3).required();
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, and regex', function (done) {

            var rule = Joi.string().min(2).max(3).regex(/^a/);
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, regex, and allow(\'\')', function (done) {

            var rule = Joi.string().min(2).max(3).regex(/^a/).allow('');
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, regex, and required', function (done) {

            var rule = Joi.string().min(2).max(3).regex(/^a/).required();
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, and alphanum', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum();
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['*ab', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, alphanum, and allow(\'\')', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum().allow('');
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['*ab', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, alphanum, and required', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum().required();
            Helper.validate(rule, [
                ['x', false],
                ['123', true],
                ['1234', false],
                ['12', true],
                ['ab', true],
                ['abc', true],
                ['abcd', false],
                ['*ab', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, alphanum, and regex', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum().regex(/^a/);
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['a2c', true],
                ['abcd', false],
                ['*ab', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, alphanum, required, and regex', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum().required().regex(/^a/);
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['a2c', true],
                ['abcd', false],
                ['*ab', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of min, max, alphanum, allow(\'\'), and regex', function (done) {

            var rule = Joi.string().min(2).max(3).alphanum().allow('').regex(/^a/);
            Helper.validate(rule, [
                ['x', false],
                ['123', false],
                ['1234', false],
                ['12', false],
                ['ab', true],
                ['abc', true],
                ['a2c', true],
                ['abcd', false],
                ['*ab', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email and min', function (done) {

            var rule = Joi.string().email().min(8);
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', true],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, and max', function (done) {

            var rule = Joi.string().email().min(8).max(10);
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', true],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, and invalid', function (done) {

            var rule = Joi.string().email().min(8).max(10).invalid('123@x.com');
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, and allow', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com');
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', true],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, allow, and invalid', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com').invalid('123@x.com');
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, allow, invalid, and allow(\'\')', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com').invalid('123@x.com').allow('');
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, allow, and allow(\'\')', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com').allow('');
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', true],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, allow, invalid, and regex', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com').invalid('123@x.com').regex(/^1/);
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, allow, invalid, regex, and allow(\'\')', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('x@x.com').invalid('123@x.com').regex(/^1/).allow('');
            Helper.validate(rule, [
                ['x@x.com', true],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, and allow(\'\')', function (done) {

            var rule = Joi.string().email().min(8).max(10).allow('');
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', true],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, and regex', function (done) {

            var rule = Joi.string().email().min(8).max(10).regex(/^1234/);
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, regex, and allow(\'\')', function (done) {

            var rule = Joi.string().email().min(8).max(10).regex(/^1234/).allow('');
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of email, min, max, regex, and required', function (done) {

            var rule = Joi.string().email().min(8).max(10).regex(/^1234/).required();
            Helper.validate(rule, [
                ['x@x.com', false],
                ['123@x.com', false],
                ['1234@x.com', true],
                ['12345@x.com', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates isoDate', function (done) {

            Helper.validate(Joi.string().isoDate(), [
                ['2013-06-07T14:21:46.295Z', true],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', true],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', true],
                ['2013-06-07T14:21:46-07:00', true],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', true],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', true],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false]
            ], done);
        });

        it('validates isoDate with a friendly error message', function (done) {

            var schema = { item: Joi.string().isoDate() };
            Joi.compile(schema).validate({ item: 'something' }, function (err, value) {

                expect(err.message).to.contain('must be a valid ISO 8601 date');
                done();
            });
        });

        it('validates combination of isoDate and min', function (done) {

            var rule = Joi.string().isoDate().min(23);
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', true],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', true],
                ['2013-06-07T14:21:46Z', false],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', true],
                ['2013-06-07T14:21:46-07:00', true],
                ['2013-06-07T14:21Z', false],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min and max', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23);
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', true],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max and invalid', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).invalid('2013-06-07T14:21+07:00');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max and allow', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', true],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, allow and invalid', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00').invalid('2013-06-07T14:21+07:00');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, allow, invalid and allow(\'\')', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00').invalid('2013-06-07T14:21+07:00').allow('');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, allow, invalid and allow(\'\')', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00').allow('');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', true],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, allow, invalid and regex', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00').invalid('2013-06-07T14:21Z').regex(/Z$/);
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', false],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, allow, invalid, regex and allow(\'\')', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('2013-06-07T14:21:46.295+07:00').invalid('2013-06-07T14:21Z').regex(/Z$/).allow('');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', true],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', false],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max and allow(\'\')', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).allow('');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', true],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', true],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max and regex', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).regex(/Z$/);
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, regex and allow(\'\')', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).regex(/Z$/).allow('');
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of isoDate, min, max, regex and required', function (done) {

            var rule = Joi.string().isoDate().min(17).max(23).regex(/Z$/).required();
            Helper.validate(rule, [
                ['2013-06-07T14:21:46.295Z', false],
                ['2013-06-07T14:21:46.295Z0', false],
                ['2013-06-07T14:21:46.295+07:00', false],
                ['2013-06-07T14:21:46.295+07:000', false],
                ['2013-06-07T14:21:46.295-07:00', false],
                ['2013-06-07T14:21:46Z', true],
                ['2013-06-07T14:21:46Z0', false],
                ['2013-06-07T14:21:46+07:00', false],
                ['2013-06-07T14:21:46-07:00', false],
                ['2013-06-07T14:21Z', true],
                ['2013-06-07T14:21+07:00', false],
                ['2013-06-07T14:21+07:000', false],
                ['2013-06-07T14:21-07:00', false],
                ['2013-06-07T14:21Z+7:00', false],
                ['2013-06-07', false],
                ['2013-06-07T', false],
                ['2013-06-07T14:21', false],
                ['1-1-2013', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates guid', function (done) {

            Helper.validate(Joi.string().guid(), [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', true],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', true],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', true],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', true],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', true],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false]
            ], done);
        });

        it('validates guid with a friendly error message', function (done) {

            var schema = { item: Joi.string().guid() };
            Joi.compile(schema).validate({ item: 'something' }, function (err, value) {

                expect(err.message).to.contain('must be a valid GUID');
                done();
            });
        });

        it('validates combination of guid and min', function (done) {

            var rule = Joi.string().guid().min(36);
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', true],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', true],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', true],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', false],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', true],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min and max', function (done) {

            var rule = Joi.string().guid().min(32).max(34);
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', true],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max and invalid', function (done) {

            var rule = Joi.string().guid().min(32).max(34).invalid('b4b2fb69c6244e5eb0698e0c6ec66618');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max and allow', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', true],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, allow and invalid', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D').invalid('b4b2fb69c6244e5eb0698e0c6ec66618');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, allow, invalid and allow(\'\')', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D').invalid('b4b2fb69c6244e5eb0698e0c6ec66618').allow('');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, allow and allow(\'\')', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D').allow('');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', true],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, allow, invalid and regex', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08').invalid('b4b2fb69c6244e5eb0698e0c6ec66618').regex(/^{7e908/);
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, allow, invalid, regex and allow(\'\')', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('{D1A5279D-B27D-4CD4-A05E-EFDD53D08').invalid('b4b2fb69c6244e5eb0698e0c6ec66618').regex(/^{7e908/).allow('');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08', true],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max and allow(\'\')', function (done) {

            var rule = Joi.string().guid().min(32).max(34).allow('');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', true],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', true],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', true],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max and regex', function (done) {

            var rule = Joi.string().guid().min(32).max(34).regex(/^{7e9081/i);
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, regex and allow(\'\')', function (done) {

            var rule = Joi.string().guid().min(32).max(34).regex(/^{7e9081/i).allow('');
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', true],
                [null, false]
            ], done);
        });

        it('validates combination of guid, min, max, regex and required', function (done) {

            var rule = Joi.string().guid().min(32).max(34).regex(/^{7e9081/i).required();
            Helper.validate(rule, [
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['{B59511BD6A5F4DF09ECF562A108D8A2E}', false],
                ['69593D62-71EA-4548-85E4-04FC71357423', false],
                ['677E2553DD4D43B09DA77414DB1EB8EA', false],
                ['{5ba3bba3-729a-4717-88c1-b7c4b7ba80db}', false],
                ['{7e9081b59a6d4cc1a8c347f69fb4198d}', true],
                ['0c74f13f-fa83-4c48-9b33-68921dd72463', false],
                ['b4b2fb69c6244e5eb0698e0c6ec66618', false],
                ['{283B67B2-430F-4E6F-97E6-19041992-C1B0}', false],
                ['{D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D', false],
                ['D1A5279D-B27D-4CD4-A05E-EFDD53D08E8D}', false],
                ['', false],
                [null, false]
            ], done);
        });
    });
});
