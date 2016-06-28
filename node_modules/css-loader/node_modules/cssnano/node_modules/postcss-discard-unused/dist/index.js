'use strict';

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _uniqs = require('uniqs');

var _uniqs2 = _interopRequireDefault(_uniqs);

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _flatten = require('flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var comma = _postcss.list.comma;
var space = _postcss.list.space;

var filterAtRule = function filterAtRule(css, properties, atrule) {
    var atRules = [];
    var values = [];
    css.eachInside(function (node) {
        if (node.type === 'decl' && properties.test(node.prop)) {
            return comma(node.value).forEach(function (val) {
                return values.push(space(val));
            });
        }
        if (node.type === 'atrule') {
            if (typeof atrule === 'string' && node.name === atrule) {
                atRules.push(node);
            } else if (atrule instanceof RegExp && atrule.test(node.name)) {
                atRules.push(node);
            }
        }
    });
    values = (0, _uniqs2['default'])((0, _flatten2['default'])(values));
    atRules.forEach(function (node) {
        var hasAtRule = values.some(function (value) {
            return value === node.params;
        });
        if (!hasAtRule) {
            node.removeSelf();
        }
    });
};

var hasFont = function hasFont(fontFamily, cache) {
    return comma(fontFamily).some(function (font) {
        return cache.some(function (c) {
            return ~c.indexOf(font);
        });
    });
};

module.exports = _postcss2['default'].plugin('postcss-discard-unused', function () {
    return function (css) {
        // fonts have slightly different logic
        var atRules = [];
        var values = [];
        css.eachInside(function (node) {
            if (node.type === 'decl' && node.parent.type === 'rule' && /font(|-family)/.test(node.prop)) {
                return values.push(comma(node.value));
            }
            if (node.type === 'atrule' && node.name === 'font-face' && node.nodes) {
                atRules.push(node);
            }
        });
        values = (0, _uniqs2['default'])((0, _flatten2['default'])(values));
        atRules.forEach(function (rule) {
            var families = rule.nodes.filter(function (node) {
                return node.prop === 'font-family';
            });
            // Discard the @font-face if it has no font-family
            if (!families.length) {
                return rule.removeSelf();
            }
            families.forEach(function (family) {
                if (!hasFont(family.value, values)) {
                    rule.removeSelf();
                }
            });
        });

        // keyframes & counter styles
        filterAtRule(css, /list-style|system/, 'counter-style');
        filterAtRule(css, /animation/, /keyframes/);
    };
});