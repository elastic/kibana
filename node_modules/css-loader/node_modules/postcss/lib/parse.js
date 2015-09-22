'use strict';

exports.__esModule = true;
exports['default'] = parse;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _parser = require('./parser');

var _parser2 = _interopRequireDefault(_parser);

var _input = require('./input');

var _input2 = _interopRequireDefault(_input);

function parse(css, opts) {
    var input = new _input2['default'](css, opts);

    var parser = new _parser2['default'](input);
    parser.tokenize();
    parser.loop();

    return parser.root;
}

module.exports = exports['default'];