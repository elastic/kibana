'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Container = function (_Node) {
    _inherits(Container, _Node);

    function Container(opts) {
        _classCallCheck(this, Container);

        var _this = _possibleConstructorReturn(this, _Node.call(this, opts));

        if (!_this.nodes) {
            _this.nodes = [];
        }
        return _this;
    }

    Container.prototype.append = function append(selector) {
        selector.parent = this;
        this.nodes.push(selector);
        return this;
    };

    Container.prototype.prepend = function prepend(selector) {
        selector.parent = this;
        this.nodes.unshift(selector);
        return this;
    };

    Container.prototype.at = function at(index) {
        return this.nodes[index];
    };

    Container.prototype.index = function index(child) {
        if (typeof child === 'number') {
            return child;
        }
        return this.nodes.indexOf(child);
    };

    Container.prototype.remove = function remove(child) {
        child = this.index(child);
        this.at(child).parent = undefined;
        this.nodes.splice(child, 1);

        var index = undefined;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (index >= child) {
                this.indexes[id] = index - 1;
            }
        }

        return this;
    };

    Container.prototype.removeAll = function removeAll() {
        for (var _iterator = this.nodes, _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
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

            node.parent = undefined;
        }
        this.nodes = [];
        return this;
    };

    Container.prototype.empty = function empty() {
        return this.removeAll();
    };

    Container.prototype.insertAfter = function insertAfter(oldNode, newNode) {
        var oldIndex = this.index(oldNode);
        this.nodes.splice(oldIndex + 1, 0, newNode);

        var index = undefined;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (oldIndex <= index) {
                this.indexes[id] = index + this.nodes.length;
            }
        }

        return this;
    };

    Container.prototype.insertBefore = function insertBefore(oldNode, newNode) {
        var oldIndex = this.index(oldNode);
        this.nodes.splice(oldIndex, 0, newNode);

        var index = undefined;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (oldIndex <= index) {
                this.indexes[id] = index + this.nodes.length;
            }
        }

        return this;
    };

    Container.prototype.each = function each(callback) {
        if (!this.lastEach) {
            this.lastEach = 0;
        }
        if (!this.indexes) {
            this.indexes = {};
        }

        this.lastEach++;
        var id = this.lastEach;
        this.indexes[id] = 0;

        if (!this.length) {
            return undefined;
        }

        var index = undefined,
            result = undefined;
        while (this.indexes[id] < this.length) {
            index = this.indexes[id];
            result = callback(this.at(index), index);
            if (result === false) {
                break;
            }

            this.indexes[id] += 1;
        }

        delete this.indexes[id];

        if (result === false) {
            return false;
        }
    };

    Container.prototype.eachInside = function eachInside(callback) {
        return this.each(function (node, i) {
            var result = callback(node, i);

            if (result !== false && node.length) {
                result = node.eachInside(callback);
            }

            if (result === false) {
                return false;
            }
        });
    };

    Container.prototype.eachAttribute = function eachAttribute(callback) {
        var _this2 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'attribute') {
                return callback.call(_this2, selector);
            }
        });
    };

    Container.prototype.eachClass = function eachClass(callback) {
        var _this3 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'class') {
                return callback.call(_this3, selector);
            }
        });
    };

    Container.prototype.eachCombinator = function eachCombinator(callback) {
        var _this4 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'combinator') {
                return callback.call(_this4, selector);
            }
        });
    };

    Container.prototype.eachComment = function eachComment(callback) {
        var _this5 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'comment') {
                return callback.call(_this5, selector);
            }
        });
    };

    Container.prototype.eachId = function eachId(callback) {
        var _this6 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'id') {
                return callback.call(_this6, selector);
            }
        });
    };

    Container.prototype.eachPseudo = function eachPseudo(callback) {
        var _this7 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'pseudo') {
                return callback.call(_this7, selector);
            }
        });
    };

    Container.prototype.eachTag = function eachTag(callback) {
        var _this8 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'tag') {
                return callback.call(_this8, selector);
            }
        });
    };

    Container.prototype.eachUniversal = function eachUniversal(callback) {
        var _this9 = this;

        return this.eachInside(function (selector) {
            if (selector.type === 'universal') {
                return callback.call(_this9, selector);
            }
        });
    };

    Container.prototype.split = function split(callback) {
        var _this10 = this;

        var current = [];
        return this.reduce(function (memo, node, index) {
            var split = callback.call(_this10, node);
            current.push(node);
            if (split) {
                memo.push(current);
                current = [];
            } else if (index === _this10.length - 1) {
                memo.push(current);
            }
            return memo;
        }, []);
    };

    Container.prototype.map = function map(callback) {
        return this.nodes.map(callback);
    };

    Container.prototype.reduce = function reduce(callback, memo) {
        return this.nodes.reduce(callback, memo);
    };

    Container.prototype.every = function every(callback) {
        return this.nodes.every(callback);
    };

    Container.prototype.some = function some(callback) {
        return this.nodes.some(callback);
    };

    Container.prototype.filter = function filter(callback) {
        return this.nodes.filter(callback);
    };

    Container.prototype.sort = function sort(callback) {
        return this.nodes.sort(callback);
    };

    Container.prototype.toString = function toString() {
        return this.map(String).join('');
    };

    _createClass(Container, [{
        key: 'first',
        get: function get() {
            return this.at(0);
        }
    }, {
        key: 'last',
        get: function get() {
            return this.at(this.length - 1);
        }
    }, {
        key: 'length',
        get: function get() {
            return this.nodes.length;
        }
    }]);

    return Container;
}(_node2.default);

exports.default = Container;
module.exports = exports['default'];