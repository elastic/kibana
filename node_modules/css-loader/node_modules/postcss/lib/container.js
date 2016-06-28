'use strict';

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _declaration = require('./declaration');

var _declaration2 = _interopRequireDefault(_declaration);

var _comment = require('./comment');

var _comment2 = _interopRequireDefault(_comment);

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

var Container = (function (_Node) {
    function Container() {
        _classCallCheck(this, Container);

        _Node.apply(this, arguments);
    }

    _inherits(Container, _Node);

    Container.prototype.stringifyContent = function stringifyContent(builder) {
        if (!this.nodes) return;

        var i = undefined,
            last = this.nodes.length - 1;
        while (last > 0) {
            if (this.nodes[last].type !== 'comment') break;
            last -= 1;
        }

        var semicolon = this.style('semicolon');
        for (i = 0; i < this.nodes.length; i++) {
            this.nodes[i].stringify(builder, last !== i || semicolon);
        }
    };

    Container.prototype.stringifyBlock = function stringifyBlock(builder, start) {
        var before = this.style('before');
        if (before) builder(before);

        var between = this.style('between', 'beforeOpen');
        builder(start + between + '{', this, 'start');

        var after = undefined;
        if (this.nodes && this.nodes.length) {
            this.stringifyContent(builder);
            after = this.style('after');
        } else {
            after = this.style('after', 'emptyBody');
        }

        if (after) builder(after);
        builder('}', this, 'end');
    };

    Container.prototype.push = function push(child) {
        child.parent = this;
        this.nodes.push(child);
        return this;
    };

    Container.prototype.each = function each(callback) {
        if (!this.lastEach) this.lastEach = 0;
        if (!this.indexes) this.indexes = {};

        this.lastEach += 1;
        var id = this.lastEach;
        this.indexes[id] = 0;

        if (!this.nodes) return undefined;

        var index = undefined,
            result = undefined;
        while (this.indexes[id] < this.nodes.length) {
            index = this.indexes[id];
            result = callback(this.nodes[index], index);
            if (result === false) break;

            this.indexes[id] += 1;
        }

        delete this.indexes[id];

        if (result === false) return false;
    };

    Container.prototype.eachInside = function eachInside(callback) {
        return this.each(function (child, i) {
            var result = callback(child, i);

            if (result !== false && child.eachInside) {
                result = child.eachInside(callback);
            }

            if (result === false) return result;
        });
    };

    Container.prototype.eachDecl = function eachDecl(prop, callback) {
        if (!callback) {
            callback = prop;
            return this.eachInside(function (child, i) {
                if (child.type === 'decl') {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        } else if (prop instanceof RegExp) {
            return this.eachInside(function (child, i) {
                if (child.type === 'decl' && prop.test(child.prop)) {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        } else {
            return this.eachInside(function (child, i) {
                if (child.type === 'decl' && child.prop === prop) {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        }
    };

    Container.prototype.eachRule = function eachRule(callback) {
        return this.eachInside(function (child, i) {
            if (child.type === 'rule') {
                var result = callback(child, i);
                if (result === false) return result;
            }
        });
    };

    Container.prototype.eachAtRule = function eachAtRule(name, callback) {
        if (!callback) {
            callback = name;
            return this.eachInside(function (child, i) {
                if (child.type === 'atrule') {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        } else if (name instanceof RegExp) {
            return this.eachInside(function (child, i) {
                if (child.type === 'atrule' && name.test(child.name)) {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        } else {
            return this.eachInside(function (child, i) {
                if (child.type === 'atrule' && child.name === name) {
                    var result = callback(child, i);
                    if (result === false) return result;
                }
            });
        }
    };

    Container.prototype.eachComment = function eachComment(callback) {
        return this.eachInside(function (child, i) {
            if (child.type === 'comment') {
                var result = callback(child, i);
                if (result === false) return result;
            }
        });
    };

    Container.prototype.append = function append(child) {
        var nodes = this.normalize(child, this.last);
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
            this.nodes.push(node);
        }return this;
    };

    Container.prototype.prepend = function prepend(child) {
        var nodes = this.normalize(child, this.first, 'prepend').reverse();
        for (var _iterator2 = nodes, _isArray2 = Array.isArray(_iterator2), _i2 = 0, _iterator2 = _isArray2 ? _iterator2 : _iterator2[Symbol.iterator]();;) {
            var _ref2;

            if (_isArray2) {
                if (_i2 >= _iterator2.length) break;
                _ref2 = _iterator2[_i2++];
            } else {
                _i2 = _iterator2.next();
                if (_i2.done) break;
                _ref2 = _i2.value;
            }

            var node = _ref2;
            this.nodes.unshift(node);
        }for (var id in this.indexes) {
            this.indexes[id] = this.indexes[id] + nodes.length;
        }

        return this;
    };

    Container.prototype.insertBefore = function insertBefore(exist, add) {
        exist = this.index(exist);

        var type = exist === 0 ? 'prepend' : false;
        var nodes = this.normalize(add, this.nodes[exist], type).reverse();
        for (var _iterator3 = nodes, _isArray3 = Array.isArray(_iterator3), _i3 = 0, _iterator3 = _isArray3 ? _iterator3 : _iterator3[Symbol.iterator]();;) {
            var _ref3;

            if (_isArray3) {
                if (_i3 >= _iterator3.length) break;
                _ref3 = _iterator3[_i3++];
            } else {
                _i3 = _iterator3.next();
                if (_i3.done) break;
                _ref3 = _i3.value;
            }

            var node = _ref3;
            this.nodes.splice(exist, 0, node);
        }var index = undefined;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (exist <= index) {
                this.indexes[id] = index + nodes.length;
            }
        }

        return this;
    };

    Container.prototype.insertAfter = function insertAfter(exist, add) {
        exist = this.index(exist);

        var nodes = this.normalize(add, this.nodes[exist]).reverse();
        for (var _iterator4 = nodes, _isArray4 = Array.isArray(_iterator4), _i4 = 0, _iterator4 = _isArray4 ? _iterator4 : _iterator4[Symbol.iterator]();;) {
            var _ref4;

            if (_isArray4) {
                if (_i4 >= _iterator4.length) break;
                _ref4 = _iterator4[_i4++];
            } else {
                _i4 = _iterator4.next();
                if (_i4.done) break;
                _ref4 = _i4.value;
            }

            var node = _ref4;
            this.nodes.splice(exist + 1, 0, node);
        }var index = undefined;
        for (var id in this.indexes) {
            index = this.indexes[id];
            if (exist < index) {
                this.indexes[id] = index + nodes.length;
            }
        }

        return this;
    };

    Container.prototype.remove = function remove(child) {
        child = this.index(child);
        this.nodes[child].parent = undefined;
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
        for (var _iterator5 = this.nodes, _isArray5 = Array.isArray(_iterator5), _i5 = 0, _iterator5 = _isArray5 ? _iterator5 : _iterator5[Symbol.iterator]();;) {
            var _ref5;

            if (_isArray5) {
                if (_i5 >= _iterator5.length) break;
                _ref5 = _iterator5[_i5++];
            } else {
                _i5 = _iterator5.next();
                if (_i5.done) break;
                _ref5 = _i5.value;
            }

            var node = _ref5;
            node.parent = undefined;
        }this.nodes = [];
        return this;
    };

    Container.prototype.replaceValues = function replaceValues(regexp, opts, callback) {
        if (!callback) {
            callback = opts;
            opts = {};
        }

        this.eachDecl(function (decl) {
            if (opts.props && opts.props.indexOf(decl.prop) === -1) return;
            if (opts.fast && decl.value.indexOf(opts.fast) === -1) return;

            decl.value = decl.value.replace(regexp, callback);
        });

        return this;
    };

    Container.prototype.every = function every(condition) {
        return this.nodes.every(condition);
    };

    Container.prototype.some = function some(condition) {
        return this.nodes.some(condition);
    };

    Container.prototype.index = function index(child) {
        if (typeof child === 'number') {
            return child;
        } else {
            return this.nodes.indexOf(child);
        }
    };

    Container.prototype.normalize = function normalize(nodes, sample) {
        var _this = this;

        if (typeof nodes === 'string') {
            var parse = require('./parse');
            nodes = parse(nodes).nodes;
        } else if (!Array.isArray(nodes)) {
            if (nodes.type === 'root') {
                nodes = nodes.nodes;
            } else if (nodes.type) {
                nodes = [nodes];
            } else if (nodes.prop) {
                if (typeof nodes.value === 'undefined') {
                    throw new Error('Value field is missed in node creation');
                }
                nodes = [new _declaration2['default'](nodes)];
            } else if (nodes.selector) {
                var Rule = require('./rule');
                nodes = [new Rule(nodes)];
            } else if (nodes.name) {
                var AtRule = require('./at-rule');
                nodes = [new AtRule(nodes)];
            } else if (nodes.text) {
                nodes = [new _comment2['default'](nodes)];
            } else {
                throw new Error('Unknown node type in node creation');
            }
        }

        var processed = nodes.map(function (child) {
            if (child.parent) child = child.clone();
            if (typeof child.before === 'undefined') {
                if (sample && typeof sample.before !== 'undefined') {
                    child.before = sample.before.replace(/[^\s]/g, '');
                }
            }
            child.parent = _this;
            return child;
        });

        return processed;
    };

    _createClass(Container, [{
        key: 'first',
        get: function get() {
            if (!this.nodes) return undefined;
            return this.nodes[0];
        }
    }, {
        key: 'last',
        get: function get() {
            if (!this.nodes) return undefined;
            return this.nodes[this.nodes.length - 1];
        }
    }]);

    return Container;
})(_node2['default']);

exports['default'] = Container;
module.exports = exports['default'];