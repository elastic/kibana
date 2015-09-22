'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _libConvert = require('./lib/convert');

var _libConvert2 = _interopRequireDefault(_libConvert);

var _postcssValueParser = require('postcss-value-parser');

var _postcssValueParser2 = _interopRequireDefault(_postcssValueParser);

var optimise = function optimise(decl) {
    if (~decl.prop.indexOf('flex')) {
        return;
    }

    var parsed = (0, _postcssValueParser2['default'])(decl.value);

    var transform = function transform(node) {
        if (node.type === 'word') {
            var number = (0, _postcssValueParser.unit)(node.value);
            if (number) {
                var num = parseFloat(number.number);
                var u = number.unit.toLowerCase();
                if (num === 0) {
                    var value = u === 'ms' || u === 's' ? 0 + u : 0;
                    node.value = value;
                    return;
                }
                node.value = (0, _libConvert2['default'])(num, u);
            }
            return;
        }
        if (node.type === 'function' && node.value === 'calc') {
            return node.nodes.forEach(transform);
        }
    };

    parsed.nodes.forEach(transform);
    decl.value = parsed.toString();
};

exports['default'] = _postcss2['default'].plugin('postcss-convert-values', function () {
    return function (css) {
        css.eachDecl(optimise);
    };
});
module.exports = exports['default'];