'use strict';

var uniqs = require('uniqs');
var postcss = require('postcss');
var comma = postcss.list.comma;
var normalize = require('normalize-selector');
var natural = require('javascript-natural-sort');
var unquote = require('./lib/unquote');
var parser = require('postcss-selector-parser');

var pseudoElements = ['::before', '::after', '::first-letter', '::first-line'];

function uniq (params, map) {
    var transform = uniqs(comma(params).map(function (selector) {
        // Join selectors that are split over new lines
        return selector.replace(/\\\n/g, '');
    })).sort(natural);
    return map ? transform : transform.join(',');
}

function optimiseAtRule (rule) {
    if (!rule.params) {
        return;
    }
    rule.params = normalize(uniq(rule.params));
}

function getParsed (selectors, callback) {
    return parser(callback).process(selectors).result;
}

/**
 * Can unquote attribute detection from mothereff.in
 * Copyright Mathias Bynens <https://mathiasbynens.be/>
 * https://github.com/mathiasbynens/mothereff.in
 */
var escapes = /\\([0-9A-Fa-f]{1,6})[ \t\n\f\r]?/g;
var range = /[\u0000-\u002c\u002e\u002f\u003A-\u0040\u005B-\u005E\u0060\u007B-\u009f]/;

function canUnquote (value) {
    value = unquote(value);
    if (value) {
        value = value.replace(escapes, 'a').replace(/\\./g, 'a');
        return !(range.test(value) || /^(?:-?\d|--)/.test(value));
    }
    return false;
}

function optimise (rule) {
    var selector = rule._selector && rule._selector.raw || rule.selector;
    rule.selector = getParsed(selector, function (selectors) {
        selectors.nodes.sort(function (a, b) {
            return natural(String(a), String(b));
        });
        var uniqueSelectors = [];
        selectors.eachInside(function (selector) {
            var next = selector.next();
            var toString = String(selector);
            // Trim whitespace around the value
            selector.spaces.before = selector.spaces.after = '';
            if (selector.type === 'attribute') {
                if (selector.value) {
                    // Join selectors that are split over new lines
                    selector.value = selector.value.replace(/\\\n/g, '').trim();
                    if (canUnquote(selector.value)) {
                        selector.value = unquote(selector.value);
                    }
                    selector.operator = selector.operator.trim();
                }
                if (selector.raw) { selector.raw.insensitive = ''; }
                selector.attribute = selector.attribute.trim();
            }
            if (selector.type === 'combinator') {
                var value = selector.value.trim();
                selector.value = value.length ? value : ' ';
            }
            if (selector.type === 'pseudo') {
                var uniques = [];
                selector.eachInside(function (child) {
                    if (child.type === 'selector') {
                        if (!~uniques.indexOf(String(child))) {
                            uniques.push(String(child));
                        } else {
                            child.removeSelf();
                        }
                    }
                });
                if (~pseudoElements.indexOf(selector.value)) {
                    selector.value = selector.value.slice(1);
                }
            }
            if (selector.type === 'selector' && selector.parent.type !== 'pseudo') {
                if (!~uniqueSelectors.indexOf(toString)) {
                    uniqueSelectors.push(toString);
                } else {
                    selector.removeSelf();
                }
            }
            if (selector.type === 'tag') {
                if (selector.value === 'from') { selector.value = '0%'; }
                if (selector.value === '100%') { selector.value = 'to'; }
            }
            if (selector.type === 'universal') {
                if (next && next.type !== 'combinator') {
                    selector.removeSelf();
                }
            }
        });
    });
}

module.exports = postcss.plugin('postcss-minify-selectors', function () {
    return function (css) {
        css.eachInside(function (node) {
            if (node.type === 'rule') { return optimise(node); }
            if (node.type === 'atrule') { return optimiseAtRule(node); }
        });
    };
});
