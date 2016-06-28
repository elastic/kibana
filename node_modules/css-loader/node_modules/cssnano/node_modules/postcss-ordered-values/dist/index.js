'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _postcss = require('postcss');

var _postcss2 = _interopRequireDefault(_postcss);

var _postcssValueParser = require('postcss-value-parser');

var _postcssValueParser2 = _interopRequireDefault(_postcssValueParser);

// border: <line-width> || <line-style> || <color>
// outline: <outline-color> || <outline-style> || <outline-width>
var borderProps = ['border', 'border-top', 'border-right', 'border-bottom', 'border-left', 'outline'];

var borderWidths = ['thin', 'medium', 'thick'];

var borderStyles = ['none', 'auto', // only in outline-style
'hidden', 'dotted', 'dashed', 'solid', 'double', 'groove', 'ridge', 'inset', 'outset'];

// flex-flow: <flex-direction> || <flex-wrap>
var flexFlowProps = ['flex-flow'];

var flexDirection = ['row', 'row-reverse', 'column', 'column-reverse'];

var flexWrap = ['nowrap ', 'wrap', 'wrap-reverse'];

var normalizeBorder = function normalizeBorder(decl) {
    if (! ~borderProps.indexOf(decl.prop)) {
        return;
    }
    var order = { width: '', style: '', color: '' };
    var border = (0, _postcssValueParser2['default'])(decl.value);
    border = border.nodes.filter(function (n) {
        return n.type !== 'space';
    });
    if (border.length > 1) {
        border.forEach(function (node) {
            var number = (0, _postcssValueParser.unit)(node.value);
            if (number || ~borderWidths.indexOf(node.value)) {
                order.width = node.value + ' ';
                return;
            }
            if (~borderStyles.indexOf(node.value)) {
                order.style = node.value + ' ';
                return;
            }
            if (node.type === 'function') {
                var value = node.nodes.map(function (n) {
                    return n.value;
                }).join('');
                order.color = node.value + '(' + value + ')';
                return;
            }
            order.color = node.value;
        });
        decl.value = ('' + order.width + order.style + order.color).trim();
    }
};

var normalizeFlexFlow = function normalizeFlexFlow(decl) {
    if (! ~flexFlowProps.indexOf(decl.prop)) {
        return;
    }
    var order = { direction: '', wrap: '' };
    var flexFlow = (0, _postcssValueParser2['default'])(decl.value);
    flexFlow = flexFlow.nodes.filter(function (n) {
        return n.type !== 'space';
    });
    if (flexFlow.length > 1) {
        flexFlow.forEach(function (node) {
            if (~flexDirection.indexOf(node.value)) {
                order.direction = node.value + ' ';
                return;
            }
            if (~flexWrap.indexOf(node.value)) {
                order.wrap = node.value + ' ';
                return;
            }
        });
        decl.value = ('' + order.direction + order.wrap).trim();
    }
};

exports['default'] = _postcss2['default'].plugin('postcss-ordered-values', function () {
    return function (css) {
        css.eachDecl(function (decl) {
            normalizeBorder(decl);
            normalizeFlexFlow(decl);
        });
    };
});
module.exports = exports['default'];