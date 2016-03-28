'use strict';

var balancedMatch = require('balanced-match');
var postcss = require('postcss');
var list = postcss.list;

function filterOptimiser(rule) {
    var match = balancedMatch('(', ')', rule.value);
    if (match) {
        var filterFunc = list.comma(match.body).join(',');
        rule.value = match.pre + '(' + filterFunc + ')' + match.post;
    }
}

module.exports = postcss.plugin('cssnano-filter-optimiser', function () {
    return function (css) {
        css.eachDecl(/filter/, filterOptimiser);
    };
});
