'use strict';

exports.__esModule = true;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var Warning = (function () {
    function Warning(text) {
        var opts = arguments[1] === undefined ? {} : arguments[1];

        _classCallCheck(this, Warning);

        this.type = 'warning';
        this.text = text;
        for (var opt in opts) {
            this[opt] = opts[opt];
        }
    }

    Warning.prototype.toString = function toString() {
        if (this.node) {
            return this.node.error(this.text, { plugin: this.plugin }).message;
        } else if (this.plugin) {
            return this.plugin + ': ' + this.text;
        } else {
            return this.text;
        }
    };

    return Warning;
})();

exports['default'] = Warning;
module.exports = exports['default'];