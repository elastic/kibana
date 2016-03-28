'use strict';

var postcss = require('postcss');
var map = require('css-list').map;

function canonical (obj) {
    return function recurse (key) {
        if (obj[key] && obj[key] !== key) {
            return recurse(obj[key]);
        }
        return key;
    };
}

function mergeAtRules (css, atrule, declaration) {
    var cache = [], replacements = {};
    css.eachAtRule(atrule, function (rule) {
        var toString = String(rule.nodes);
        var cached = cache.filter(function (c) {
            return String(c.nodes) === toString && c.name === rule.name;
        });
        if (cached.length) {
            replacements[cached[0].params] = rule.params;
            cached[0].removeSelf();
            cache = cache.splice(cache.indexOf(cached[0]) + 1, 1);
        }
        cache.push(rule);
    });

    var canon = canonical(replacements);

    css.eachDecl(declaration, function (decl) {
        decl.value = map(decl.value, function (value) {
            return canon(value);
        });
    });
}

module.exports = postcss.plugin('postcss-merge-idents', function () {
    return function (css) {
        mergeAtRules(css, /keyframes/, /animation/);
        mergeAtRules(css, 'counter-style', /(list-style|system)/);
    };
});
