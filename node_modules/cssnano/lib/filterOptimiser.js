'use strict';

var balancedMatch = require('balanced-match');
var list = require('postcss').list;

function filterOptimiser(rule) {
    var match = balancedMatch('(', ')', rule.value);
    if (match) {
        var filterFunc = list.comma(match.body).join(',');
        rule.value = match.pre + '(' + filterFunc + ')' + match.post;
    }
}

module.exports = function () {
    return function (css) {
        css.eachDecl(/filter/, filterOptimiser);
    };
};
