'use strict';

var colormin = require('colormin');
var postcss = require('postcss');
var list = postcss.list;
var reduce = require('reduce-function-call');
var color = require('color');
var trim = require('colormin/dist/lib/stripWhitespace');

function eachVal (values) {
    return list.comma(values).map(function (value) {
        return list.space(value).map(colormin).join(' ');
    }).join(',');
}

module.exports = postcss.plugin('postcss-colormin', function () {
    return function (css) {
        css.eachDecl(function (decl) {
            if (/^(?!font|filter|-webkit-tap-highlight-color)/.test(decl.prop)) {
                decl.value = eachVal(decl.value);
                decl.value = reduce(decl.value, 'gradient', function (body, fn) {
                    return fn + '(' + list.comma(body).map(eachVal).join(',') + ')';
                });
            }
            if (decl.prop === '-webkit-tap-highlight-color') {
                if (decl.value === 'inherit' || decl.value === 'transparent') {
                    return;
                }
                decl.value = trim(color(decl.value).rgbString());
            }
        });
    };
});
