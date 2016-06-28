'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _cssSyntaxError = require('./css-syntax-error');

var _cssSyntaxError2 = _interopRequireDefault(_cssSyntaxError);

var defaultStyle = {
    colon: ': ',
    indent: '    ',
    beforeDecl: '\n',
    beforeRule: '\n',
    beforeOpen: ' ',
    beforeClose: '\n',
    beforeComment: '\n',
    after: '\n',
    emptyBody: '',
    commentLeft: ' ',
    commentRight: ' '
};

var cloneNode = function cloneNode(obj, parent) {
    var cloned = new obj.constructor();

    for (var i in obj) {
        if (!obj.hasOwnProperty(i)) continue;
        var value = obj[i];
        var type = typeof value;

        if (i === 'parent' && type === 'object') {
            if (parent) cloned[i] = parent;
        } else if (i === 'source') {
            cloned[i] = value;
        } else if (value instanceof Array) {
            cloned[i] = value.map(function (j) {
                return cloneNode(j, cloned);
            });
        } else if (i !== 'before' && i !== 'after' && i !== 'between' && i !== 'semicolon') {
            if (type === 'object') value = cloneNode(value);
            cloned[i] = value;
        }
    }

    return cloned;
};

var _default = (function () {
    var _class = function _default() {
        var defaults = arguments[0] === undefined ? {} : arguments[0];

        _classCallCheck(this, _class);

        for (var _name in defaults) {
            this[_name] = defaults[_name];
        }
    };

    _class.prototype.error = function error(message) {
        var opts = arguments[1] === undefined ? {} : arguments[1];

        if (this.source) {
            var pos = this.source.start;
            return this.source.input.error(message, pos.line, pos.column, opts);
        } else {
            return new _cssSyntaxError2['default'](message);
        }
    };

    _class.prototype.removeSelf = function removeSelf() {
        if (this.parent) {
            this.parent.remove(this);
        }
        this.parent = undefined;
        return this;
    };

    _class.prototype.replace = function replace(nodes) {
        this.parent.insertBefore(this, nodes);
        this.parent.remove(this);
        return this;
    };

    _class.prototype.toString = function toString() {
        var result = '';
        var builder = function builder(str) {
            return result += str;
        };
        this.stringify(builder);
        return result;
    };

    _class.prototype.clone = function clone() {
        var overrides = arguments[0] === undefined ? {} : arguments[0];

        var cloned = cloneNode(this);
        for (var _name2 in overrides) {
            cloned[_name2] = overrides[_name2];
        }
        return cloned;
    };

    _class.prototype.cloneBefore = function cloneBefore() {
        var overrides = arguments[0] === undefined ? {} : arguments[0];

        var cloned = this.clone(overrides);
        this.parent.insertBefore(this, cloned);
        return cloned;
    };

    _class.prototype.cloneAfter = function cloneAfter() {
        var overrides = arguments[0] === undefined ? {} : arguments[0];

        var cloned = this.clone(overrides);
        this.parent.insertAfter(this, cloned);
        return cloned;
    };

    _class.prototype.replaceWith = function replaceWith(node) {
        this.parent.insertBefore(this, node);
        this.removeSelf();
        return this;
    };

    _class.prototype.moveTo = function moveTo(container) {
        this.cleanStyles(this.root() === container.root());
        this.removeSelf();
        container.append(this);
        return this;
    };

    _class.prototype.moveBefore = function moveBefore(node) {
        this.cleanStyles(this.root() === node.root());
        this.removeSelf();
        node.parent.insertBefore(node, this);
        return this;
    };

    _class.prototype.moveAfter = function moveAfter(node) {
        this.cleanStyles(this.root() === node.root());
        this.removeSelf();
        node.parent.insertAfter(node, this);
        return this;
    };

    _class.prototype.next = function next() {
        var index = this.parent.index(this);
        return this.parent.nodes[index + 1];
    };

    _class.prototype.prev = function prev() {
        var index = this.parent.index(this);
        return this.parent.nodes[index - 1];
    };

    _class.prototype.toJSON = function toJSON() {
        var fixed = {};

        for (var _name3 in this) {
            if (!this.hasOwnProperty(_name3)) continue;
            if (_name3 === 'parent') continue;
            var value = this[_name3];

            if (value instanceof Array) {
                fixed[_name3] = value.map(function (i) {
                    if (typeof i === 'object' && i.toJSON) {
                        return i.toJSON();
                    } else {
                        return i;
                    }
                });
            } else if (typeof value === 'object' && value.toJSON) {
                fixed[_name3] = value.toJSON();
            } else {
                fixed[_name3] = value;
            }
        }

        return fixed;
    };

    _class.prototype.style = function style(own, detect) {
        var value = undefined;
        if (!detect) detect = own;

        // Already had
        if (own) {
            value = this[own];
            if (typeof value !== 'undefined') return value;
        }

        var parent = this.parent;

        // Hack for first rule in CSS
        if (detect === 'before') {
            if (!parent || parent.type === 'root' && parent.first === this) {
                return '';
            }
        }

        // Floating child without parent
        if (!parent) return defaultStyle[detect];

        // Detect style by other nodes
        var root = this.root();
        if (!root.styleCache) root.styleCache = {};
        if (typeof root.styleCache[detect] !== 'undefined') {
            return root.styleCache[detect];
        }

        if (detect === 'semicolon') {
            root.eachInside(function (i) {
                if (i.nodes && i.nodes.length && i.last.type === 'decl') {
                    value = i.semicolon;
                    if (typeof value !== 'undefined') return false;
                }
            });
        } else if (detect === 'emptyBody') {
            root.eachInside(function (i) {
                if (i.nodes && i.nodes.length === 0) {
                    value = i.after;
                    if (typeof value !== 'undefined') return false;
                }
            });
        } else if (detect === 'indent') {
            root.eachInside(function (i) {
                var p = i.parent;
                if (p && p !== root && p.parent && p.parent === root) {
                    if (typeof i.before !== 'undefined') {
                        var parts = i.before.split('\n');
                        value = parts[parts.length - 1];
                        value = value.replace(/[^\s]/g, '');
                        return false;
                    }
                }
            });
        } else if (detect === 'beforeComment') {
            root.eachComment(function (i) {
                if (typeof i.before !== 'undefined') {
                    value = i.before;
                    if (value.indexOf('\n') !== -1) {
                        value = value.replace(/[^\n]+$/, '');
                    }
                    return false;
                }
            });
            if (typeof value === 'undefined') {
                value = this.style(null, 'beforeDecl');
            }
        } else if (detect === 'beforeDecl') {
            root.eachDecl(function (i) {
                if (typeof i.before !== 'undefined') {
                    value = i.before;
                    if (value.indexOf('\n') !== -1) {
                        value = value.replace(/[^\n]+$/, '');
                    }
                    return false;
                }
            });
            if (typeof value === 'undefined') {
                value = this.style(null, 'beforeRule');
            }
        } else if (detect === 'beforeRule') {
            root.eachInside(function (i) {
                if (i.nodes && (i.parent !== root || root.first !== i)) {
                    if (typeof i.before !== 'undefined') {
                        value = i.before;
                        if (value.indexOf('\n') !== -1) {
                            value = value.replace(/[^\n]+$/, '');
                        }
                        return false;
                    }
                }
            });
        } else if (detect === 'beforeClose') {
            root.eachInside(function (i) {
                if (i.nodes && i.nodes.length > 0) {
                    if (typeof i.after !== 'undefined') {
                        value = i.after;
                        if (value.indexOf('\n') !== -1) {
                            value = value.replace(/[^\n]+$/, '');
                        }
                        return false;
                    }
                }
            });
        } else if (detect === 'before' || detect === 'after') {
            if (this.type === 'decl') {
                value = this.style(null, 'beforeDecl');
            } else if (this.type === 'comment') {
                value = this.style(null, 'beforeComment');
            } else if (detect === 'before') {
                value = this.style(null, 'beforeRule');
            } else {
                value = this.style(null, 'beforeClose');
            }

            var node = this.parent;
            var depth = 0;
            while (node && node.type !== 'root') {
                depth += 1;
                node = node.parent;
            }

            if (value.indexOf('\n') !== -1) {
                var indent = this.style(null, 'indent');
                if (indent.length) {
                    for (var step = 0; step < depth; step++) {
                        value += indent;
                    }
                }
            }

            return value;
        } else if (detect === 'colon') {
            root.eachDecl(function (i) {
                if (typeof i.between !== 'undefined') {
                    value = i.between.replace(/[^\s:]/g, '');
                    return false;
                }
            });
        } else if (detect === 'beforeOpen') {
            root.eachInside(function (i) {
                if (i.type !== 'decl') {
                    value = i.between;
                    if (typeof value !== 'undefined') return false;
                }
            });
        } else {
            root.eachInside(function (i) {
                value = i[own];
                if (typeof value !== 'undefined') return false;
            });
        }

        if (typeof value === 'undefined') value = defaultStyle[detect];

        root.styleCache[detect] = value;
        return value;
    };

    _class.prototype.root = function root() {
        var result = this;
        while (result.parent) result = result.parent;
        return result;
    };

    _class.prototype.cleanStyles = function cleanStyles(keepBetween) {
        delete this.before;
        delete this.after;
        if (!keepBetween) delete this.between;

        if (this.nodes) {
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
                node.cleanStyles(keepBetween);
            }
        }
    };

    _class.prototype.stringifyRaw = function stringifyRaw(prop) {
        var value = this[prop];
        var raw = this['_' + prop];
        if (raw && raw.value === value) {
            return raw.raw;
        } else {
            return value;
        }
    };

    return _class;
})();

exports['default'] = _default;
module.exports = exports['default'];