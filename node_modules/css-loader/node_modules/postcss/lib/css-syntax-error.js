'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _warnOnce = require('./warn-once');

var _warnOnce2 = _interopRequireDefault(_warnOnce);

var CssSyntaxError = (function (_SyntaxError) {
    function CssSyntaxError(message, line, column, source, file, plugin) {
        _classCallCheck(this, CssSyntaxError);

        _SyntaxError.call(this, message);
        this.reason = message;

        if (file) this.file = file;
        if (source) this.source = source;
        if (plugin) this.plugin = plugin;
        if (typeof line !== 'undefined' && typeof column !== 'undefined') {
            this.line = line;
            this.column = column;
        }

        this.setMessage();

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, CssSyntaxError);
        }
    }

    _inherits(CssSyntaxError, _SyntaxError);

    CssSyntaxError.prototype.setMessage = function setMessage() {
        this.message = this.plugin ? this.plugin + ': ' : '';
        this.message += this.file ? this.file : '<css input>';
        if (typeof this.line !== 'undefined') {
            this.message += ':' + this.line + ':' + this.column;
        }
        this.message += ': ' + this.reason;
    };

    CssSyntaxError.prototype.showSourceCode = function showSourceCode(color) {
        if (!this.source) return '';

        var num = this.line - 1;
        var lines = this.source.split('\n');

        var prev = num > 0 ? lines[num - 1] + '\n' : '';
        var broken = lines[num];
        var next = num < lines.length - 1 ? '\n' + lines[num + 1] : '';

        var mark = '\n';
        for (var i = 0; i < this.column - 1; i++) {
            mark += ' ';
        }

        if (typeof color === 'undefined' && typeof process !== 'undefined') {
            if (process.stdout && process.env) {
                color = process.stdout.isTTY && !process.env.NODE_DISABLE_COLORS;
            }
        }

        if (color) {
            mark += '\u001b[1;31m^\u001b[0m';
        } else {
            mark += '^';
        }

        return '\n' + prev + broken + mark + next;
    };

    CssSyntaxError.prototype.highlight = function highlight(color) {
        _warnOnce2['default']('CssSyntaxError#highlight is deprecated and will be ' + 'removed in 5.0. Use error.showSourceCode instead.');
        return this.showSourceCode(color).replace(/^\n/, '');
    };

    CssSyntaxError.prototype.setMozillaProps = function setMozillaProps() {
        var sample = Error.call(this, this.message);
        if (sample.columnNumber) this.columnNumber = this.column;
        if (sample.description) this.description = this.message;
        if (sample.lineNumber) this.lineNumber = this.line;
        if (sample.fileName) this.fileName = this.file;
    };

    CssSyntaxError.prototype.toString = function toString() {
        return this.name + ': ' + this.message + this.showSourceCode();
    };

    return CssSyntaxError;
})(SyntaxError);

exports['default'] = CssSyntaxError;

CssSyntaxError.prototype.name = 'CssSyntaxError';
module.exports = exports['default'];