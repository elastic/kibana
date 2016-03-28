'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _lazyResult = require('./lazy-result');

var _lazyResult2 = _interopRequireDefault(_lazyResult);

var Processor = (function () {
    function Processor() {
        var plugins = arguments[0] === undefined ? [] : arguments[0];

        _classCallCheck(this, Processor);

        this.plugins = this.normalize(plugins);
    }

    Processor.prototype.use = function use(plugin) {
        this.plugins = this.plugins.concat(this.normalize([plugin]));
        return this;
    };

    Processor.prototype.process = function process(css) {
        var opts = arguments[1] === undefined ? {} : arguments[1];

        return new _lazyResult2['default'](this, css, opts);
    };

    Processor.prototype.normalize = function normalize(plugins) {
        var normalized = [];
        for (var _iterator = plugins, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var i = _ref;

            var type = typeof i;
            if ((type === 'object' || type === 'function') && i.postcss) {
                i = i.postcss;
            }

            if (typeof i === 'object' && Array.isArray(i.plugins)) {
                normalized = normalized.concat(i.plugins);
            } else {
                normalized.push(i);
            }
        }
        return normalized;
    };

    return Processor;
})();

exports['default'] = Processor;

Processor.prototype.version = require('../package').version;
module.exports = exports['default'];