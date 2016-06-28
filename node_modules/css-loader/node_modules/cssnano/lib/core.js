'use strict';

var postcss = require('postcss');

function minimiseWhitespace (rule) {
    rule.before = rule.between = rule.after = '';
    rule.semicolon = false;
}

module.exports = postcss.plugin('cssnano-core', function () {
    return function (css) {
        css.eachDecl(function (declaration) {
            // Ensure that !important values do not have any excess whitespace
            if (declaration.important) {
                declaration._important = '!important';
            }
            // Trim unnecessary space around e.g. 12px / 18px
            declaration.value = declaration.value.replace(/\s*(\/)\s*/, '$1');
            if (~[
                    'outline',
                    'outline-left',
                    'outline-right',
                    'outline-top',
                    'outline-bottom'
                ].indexOf(declaration.prop)) {
                declaration.value = declaration.value.replace('none', '0');
            }
            // Remove whitespaces around ie 9 hack
            declaration.value = declaration.value.replace(/\s*(\\9)\s*/, '$1');
            // Remove extra semicolons and whitespace before the declaration
            if (declaration.before) {
                declaration.before = declaration.before.replace(/[;\s]/g, '');
            }
            declaration.between = ':';
            declaration.semicolon = false;
        });

        css.eachRule(minimiseWhitespace);
        css.eachAtRule(minimiseWhitespace);

        // Remove final newline
        css.after = '';
    };
});
