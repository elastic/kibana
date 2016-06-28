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


describe('func', function () {

    it('should validate a function', function (done) {

        Helper.validate(Joi.func().required(), [
            [function () { }, true],
            ['', false]
        ], done);
    });
});

