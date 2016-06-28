'use strict';

exports.__esModule = true;
exports.isKeyword = exports.isRGBorHSL = exports.isHex = undefined;

var _colourNames = require('./colourNames');

var _colourNames2 = _interopRequireDefault(_colourNames);

var _toLonghand = require('./toLonghand');

var _toLonghand2 = _interopRequireDefault(_toLonghand);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var isHex = exports.isHex = function isHex(colour) {
    if (colour[0] === '#') {
        var c = (0, _toLonghand2.default)(colour).substring(1);
        return c.length === 6 && !isNaN(parseInt(c, 16));
    }
    return false;
};

var isRGBorHSL = exports.isRGBorHSL = function isRGBorHSL(colour) {
    return (/^(rgb|hsl)a?\(.*?\)/.test(colour)
    );
};

var isKeyword = exports.isKeyword = function isKeyword(colour) {
    return ~Object.keys(_colourNames2.default).indexOf(colour.toLowerCase());
};