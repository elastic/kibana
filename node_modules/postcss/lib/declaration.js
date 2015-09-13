'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

var Declaration = (function (_Node) {
    function Declaration(defaults) {
        _classCallCheck(this, Declaration);

        _Node.call(this, defaults);
        this.type = 'decl';
    }

    _inherits(Declaration, _Node);

    Declaration.prototype.stringify = function stringify(builder, semicolon) {
        var before = this.style('before');
        if (before) builder(before);

        var between = this.style('between', 'colon');
        var string = this.prop + between + this.stringifyRaw('value');

        if (this.important) {
            string += this._important || ' !important';
        }

        if (semicolon) string += ';';
        builder(string, this);
    };

    return Declaration;
})(_node2['default']);

exports['default'] = Declaration;
module.exports = exports['default'];