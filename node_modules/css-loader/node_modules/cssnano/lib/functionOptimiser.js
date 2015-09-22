'use strict';

var postcss = require('postcss');
var list = postcss.list;
var cssList = require('css-list');
var balancedMatch = require('balanced-match');

var functions = [
    'calc',
    'cubic-bezier',
    'gradient',
    'rect',
    'rotate3d',
    'scale',
    'scale3d',
    'transform3d',
    'translate3d',
    'url',
    'var'
];

function optimise (decl) {
    decl.value = cssList.map(decl.value, function (value, type) {
        if (type !== 'func') {
            return value;
        }
        var match = balancedMatch('(', ')', value);
        if (!~functions.indexOf(match.pre)) {
            return value;
        }
        return [
            match.pre,
            '(',
            list.comma(match.body).map(function (value) {
                return list.space(value).join(' ');
            }).join(','),
            ')',
            match.post
        ].join('');
    });
}

module.exports = postcss.plugin('cssnano-function-optimiser', function () {
    return function (css) {
        css.eachDecl(optimise);
    };
});
