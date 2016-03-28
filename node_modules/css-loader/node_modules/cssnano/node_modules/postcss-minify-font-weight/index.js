'use strict';

var postcss = require('postcss');

function optimise (decl) {
    var value = decl.value;
    // AST values must be strings
    decl.value = value === 'normal' ? '400' : value === 'bold' ? '700' : value;
}

module.exports = postcss.plugin('postcss-minify-font-weight', function () {
    return function (css) {
        css.eachDecl('font-weight', optimise);
    };
});
