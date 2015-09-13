'use strict';

var list = require('postcss').list;
var cssList = require('css-list');
var balancedMatch = require('balanced-match');

var functions = [
    'calc',
    'cubic-bezier',
    'gradient',
    'hsl',
    'rect',
    'rgb',
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

module.exports = function () {
    return function (css) {
        functions.forEach(function (fn) {
            css.eachDecl(optimise);
        });
    };
};
