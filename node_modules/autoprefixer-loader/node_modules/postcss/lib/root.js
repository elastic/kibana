'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _container = require('./container');

var _container2 = _interopRequireDefault(_container);

var Root = (function (_Container) {
    function Root(defaults) {
        _classCallCheck(this, Root);

        _Container.call(this, defaults);
        if (!this.nodes) this.nodes = [];
        this.type = 'root';
    }

    _inherits(Root, _Container);

    Root.prototype.remove = function remove(child) {
        child = this.index(child);

        if (child === 0 && this.nodes.length > 1) {
            this.nodes[1].before = this.nodes[child].before;
        }

        return _Container.prototype.remove.call(this, child);
    };

    Root.prototype.normalize = function normalize(child, sample, type) {
        var nodes = _Container.prototype.normalize.call(this, child);

        if (sample) {
            if (type === 'prepend') {
                if (this.nodes.length > 1) {
                    sample.before = this.nodes[1].before;
                } else {
                    delete sample.before;
                }
            } else {
                for (var _iterator = nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
                    var _ref;

                    if (_isArray) {
                        if (_i >= _iterator.length) break;
                        _ref = _iterator[_i++];
                    } else {
                        _i = _iterator.next();
                        if (_i.done) break;
                        _ref = _i.value;
                    }

                    var node = _ref;

                    if (this.first !== sample) node.before = sample.before;
                }
            }
        }

        return nodes;
    };

    Root.prototype.stringify = function stringify(builder) {
        this.stringifyContent(builder);
        if (this.after) builder(this.after);
    };

    Root.prototype.toResult = function toResult() {
        var opts = arguments[0] === undefined ? {} : arguments[0];

        var LazyResult = require('./lazy-result');
        var Processor = require('./processor');

        var lazy = new LazyResult(new Processor(), this, opts);
        return lazy.stringify();
    };

    return Root;
})(_container2['default']);

exports['default'] = Root;
module.exports = exports['default'];