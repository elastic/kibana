'use strict';

var flatten = require('flatten');

module.exports = function identicalValues (/** rules... */) {
    var rules = flatten(Array.prototype.slice.call(arguments));
    var candidate = rules[0].value;
    return rules.every(function (rule) {
        return rule.value === candidate;
    });
};
