'use strict';

var postcss = require('postcss');
var reduce = require('reduce-function-call');
var encode = require('./lib/encode');
var list = postcss.list;

function eachValue (value, callback) {
    return list.space(value).map(function (val) {
        return list.comma(val).map(callback).join();
    }).join(' ');
}

function transformAtRule (css, atRuleRegex, propRegex) {
    var cache = {};
    var ruleCache = [];
    // Encode at rule names and cache the result
    css.eachAtRule(atRuleRegex, function (rule) {
        if (!cache[rule.params]) {
            cache[rule.params] = {
                ident: encode(Object.keys(cache).length),
                count: 0
            };
        }
        rule.params = cache[rule.params].ident;
        ruleCache.push(rule);
    });
    // Iterate each property and change their names
    css.eachDecl(propRegex, function (decl) {
        decl.value = eachValue(decl.value, function (value) {
            if (value in cache) {
                cache[value].count++;
                return cache[value].ident;
            }
            return value;
        });
    });
    // Ensure that at rules with no references to them are left unchanged
    ruleCache.forEach(function (rule) {
        Object.keys(cache).forEach(function (key) {
            var k = cache[key];
            if (k.ident === rule.params && !k.count) {
                rule.params = key;
            }
        });
    });
}

module.exports = postcss.plugin('postcss-reduce-idents', function () {
    return function (css) {
        var cache = {};
        var declCache = [];
        css.eachDecl(/counter-(reset|increment)/, function (decl) {
            decl.value = eachValue(decl.value, function (value) {
                if (!/^-?\d*$/.test(value)) {
                    if (!cache[value]) {
                        cache[value] = {
                            ident: encode(Object.keys(cache).length),
                            count: 0
                        };
                    }
                    return cache[value].ident;
                }
                return value;
            });
            declCache.push(decl);
        });
        css.eachDecl('content', function (decl) {
            decl.value = eachValue(decl.value, function (value) {
                return reduce(value, /(counters?)\(/, function (body, fn) {
                    var counters = list.comma(body).map(function (counter) {
                        if (counter in cache) {
                            cache[counter].count++;
                            return cache[counter].ident;
                        }
                        return counter;
                    }).join(',');
                    return fn + '(' + counters + ')';
                });
            });
        });
        declCache.forEach(function (decl) {
            decl.value = eachValue(decl.value, function (value) {
                if (!/^-?\d*$/.test(value)) {
                    Object.keys(cache).forEach(function (key) {
                        var k = cache[key];
                        if (k.ident === value && !k.count) {
                            value = key;
                        }
                    });
                    return value;
                }
                return value;
            });
        });
        // Transform @keyframes, @counter-style
        transformAtRule(css, /keyframes/, /animation/);
        transformAtRule(css, 'counter-style', /(list-style|system)/);
    };
});
