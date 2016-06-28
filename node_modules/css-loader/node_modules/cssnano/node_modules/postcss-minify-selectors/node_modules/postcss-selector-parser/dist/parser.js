'use strict';

exports.__esModule = true;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _root = require('./selectors/root');

var _root2 = _interopRequireDefault(_root);

var _selector = require('./selectors/selector');

var _selector2 = _interopRequireDefault(_selector);

var _className = require('./selectors/className');

var _className2 = _interopRequireDefault(_className);

var _comment = require('./selectors/comment');

var _comment2 = _interopRequireDefault(_comment);

var _id = require('./selectors/id');

var _id2 = _interopRequireDefault(_id);

var _tag = require('./selectors/tag');

var _tag2 = _interopRequireDefault(_tag);

var _string = require('./selectors/string');

var _string2 = _interopRequireDefault(_string);

var _pseudo = require('./selectors/pseudo');

var _pseudo2 = _interopRequireDefault(_pseudo);

var _attribute = require('./selectors/attribute');

var _attribute2 = _interopRequireDefault(_attribute);

var _universal = require('./selectors/universal');

var _universal2 = _interopRequireDefault(_universal);

var _combinator = require('./selectors/combinator');

var _combinator2 = _interopRequireDefault(_combinator);

var _sortAscending = require('./sortAscending');

var _sortAscending2 = _interopRequireDefault(_sortAscending);

var _tokenize = require('./tokenize');

var _tokenize2 = _interopRequireDefault(_tokenize);

var _flatten = require('flatten');

var _flatten2 = _interopRequireDefault(_flatten);

var _indexesOf = require('indexes-of');

var _indexesOf2 = _interopRequireDefault(_indexesOf);

var _uniq = require('uniq');

var _uniq2 = _interopRequireDefault(_uniq);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Parser = function () {
    function Parser(input) {
        _classCallCheck(this, Parser);

        this.input = input;
        this.position = 0;
        this.root = new _root2.default();

        var selectors = new _selector2.default();
        this.root.append(selectors);

        this.current = selectors;
        this.tokens = (0, _tokenize2.default)(input);

        return this.loop();
    }

    Parser.prototype.attribute = function attribute() {
        var str = '';
        var attr = undefined;
        var startingToken = this.currToken;
        this.position++;
        while (this.position < this.tokens.length && this.currToken[0] !== ']') {
            str += this.tokens[this.position][1];
            this.position++;
        }
        if (this.position === this.tokens.length && ! ~str.indexOf(']')) {
            this.error('Expected a closing square bracket.');
        }
        var parts = str.split(/((?:[*~^$|]?)=)/);
        var namespace = parts[0].split(/(\|)/g);
        var attributeProps = {
            operator: parts[1],
            value: parts[2],
            source: {
                start: {
                    line: startingToken[2],
                    column: startingToken[3]
                },
                end: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                }
            },
            sourceIndex: startingToken[4]
        };
        if (namespace.length > 1) {
            if (namespace[0] === '') {
                namespace[0] = true;
            }
            attributeProps.attribute = namespace[2];
            attributeProps.namespace = namespace[0];
        } else {
            attributeProps.attribute = parts[0];
        }
        attr = new _attribute2.default(attributeProps);

        if (parts[2]) {
            var insensitive = parts[2].split(/(\s+i\s*?)$/);
            attr.value = insensitive[0];
            if (insensitive[1]) {
                attr.insensitive = true;
                attr.raw.insensitive = insensitive[1];
            }
        }
        this.newNode(attr);
        this.position++;
    };

    Parser.prototype.combinator = function combinator() {
        if (this.currToken[1] === '|') {
            return this.namespace();
        }
        var node = new _combinator2.default({
            value: '',
            source: {
                start: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                },
                end: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                }
            },
            sourceIndex: this.currToken[4]
        });
        while (this.position < this.tokens.length && this.currToken && (this.currToken[0] === 'space' || this.currToken[0] === 'combinator')) {
            if (this.nextToken && this.nextToken[0] === 'combinator') {
                node.spaces.before = this.currToken[1];
                node.source.start.line = this.nextToken[2];
                node.source.start.column = this.nextToken[3];
                node.source.end.column = this.nextToken[3];
                node.source.end.line = this.nextToken[2];
                node.sourceIndex = this.nextToken[4];
            } else if (this.prevToken && this.prevToken[0] === 'combinator') {
                node.spaces.after = this.currToken[1];
            } else if (this.currToken[0] === 'space' || this.currToken[0] === 'combinator') {
                node.value = this.currToken[1];
            }
            this.position++;
        }
        return this.newNode(node);
    };

    Parser.prototype.comma = function comma() {
        if (this.position === this.tokens.length - 1) {
            this.root.trailingComma = true;
            this.position++;
            return;
        }
        var selectors = new _selector2.default();
        this.current.parent.append(selectors);
        this.current = selectors;
        this.position++;
    };

    Parser.prototype.comment = function comment() {
        var node = new _comment2.default({
            value: this.currToken[1],
            source: {
                start: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                },
                end: {
                    line: this.currToken[4],
                    column: this.currToken[5]
                }
            },
            sourceIndex: this.currToken[6]
        });
        this.newNode(node);
        this.position++;
    };

    Parser.prototype.error = function error(message) {
        throw new this.input.error(message); // eslint-disable-line new-cap
    };

    Parser.prototype.missingParenthesis = function missingParenthesis() {
        return this.error('Expected opening parenthesis.');
    };

    Parser.prototype.missingSquareBracket = function missingSquareBracket() {
        return this.error('Expected opening square bracket.');
    };

    Parser.prototype.namespace = function namespace() {
        var before = this.prevToken && this.prevToken[1] || true;
        if (this.nextToken[0] === 'word') {
            this.position++;
            return this.word(before);
        } else if (this.nextToken[0] === '*') {
            this.position++;
            return this.universal(before);
        }
    };

    Parser.prototype.parentheses = function parentheses() {
        var last = this.current.last;
        if (last && last.type === 'pseudo') {
            var selector = new _selector2.default();
            var cache = this.current;
            last.append(selector);
            this.current = selector;
            var balanced = 1;
            this.position++;
            while (this.position < this.tokens.length && balanced) {
                if (this.currToken[0] === '(') {
                    balanced++;
                }
                if (this.currToken[0] === ')') {
                    balanced--;
                }
                if (balanced) {
                    this.parse();
                } else {
                    selector.parent.source.end.line = this.currToken[2];
                    selector.parent.source.end.column = this.currToken[3];
                    this.position++;
                }
            }
            if (balanced) {
                this.error('Expected closing parenthesis.');
            }
            this.current = cache;
        } else {
            var balanced = 1;
            this.position++;
            last.value += '(';
            while (this.position < this.tokens.length && balanced) {
                if (this.currToken[0] === '(') {
                    balanced++;
                }
                if (this.currToken[0] === ')') {
                    balanced--;
                }
                last.value += this.currToken[1];
                this.position++;
            }
            if (balanced) {
                this.error('Expected closing parenthesis.');
            }
        }
    };

    Parser.prototype.pseudo = function pseudo() {
        var _this = this;

        var pseudoStr = '';
        var startingToken = this.currToken;
        while (this.currToken && this.currToken[0] === ':') {
            pseudoStr += this.currToken[1];
            this.position++;
        }
        if (!this.currToken) {
            return this.error('Expected pseudo-class or pseudo-element');
        }
        if (this.currToken[0] === 'word') {
            (function () {
                var pseudo = undefined;
                _this.splitWord(false, function (first, length) {
                    pseudoStr += first;
                    pseudo = new _pseudo2.default({
                        value: pseudoStr,
                        source: {
                            start: {
                                line: startingToken[2],
                                column: startingToken[3]
                            },
                            end: {
                                line: _this.currToken[4],
                                column: _this.currToken[5]
                            }
                        },
                        sourceIndex: startingToken[4]
                    });
                    _this.newNode(pseudo);
                    if (length > 1 && _this.nextToken && _this.nextToken[0] === '(') {
                        _this.error('Misplaced parenthesis.');
                    }
                });
            })();
        } else {
            this.error('Unexpected "' + this.currToken[0] + '" found.');
        }
    };

    Parser.prototype.space = function space() {
        var token = this.currToken;
        // Handle space before and after the selector
        if (this.position === 0 || this.prevToken[0] === ',' || this.prevToken[0] === '(') {
            this.spaces = token[1];
            this.position++;
        } else if (this.position === this.tokens.length - 1 || this.nextToken[0] === ',' || this.nextToken[0] === ')') {
            this.current.last.spaces.after = token[1];
            this.position++;
        } else {
            this.combinator();
        }
    };

    Parser.prototype.string = function string() {
        var token = this.currToken;
        this.newNode(new _string2.default({
            value: this.currToken[1],
            source: {
                start: {
                    line: token[2],
                    column: token[3]
                },
                end: {
                    line: token[4],
                    column: token[5]
                }
            },
            sourceIndex: token[6]
        }));
        this.position++;
    };

    Parser.prototype.universal = function universal(namespace) {
        var nextToken = this.nextToken;
        if (nextToken && nextToken[1] === '|') {
            this.position++;
            return this.namespace();
        }
        this.newNode(new _universal2.default({
            value: this.currToken[1],
            source: {
                start: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                },
                end: {
                    line: this.currToken[2],
                    column: this.currToken[3]
                }
            },
            sourceIndex: this.currToken[4]
        }), namespace);
        this.position++;
    };

    Parser.prototype.splitWord = function splitWord(namespace, firstCallback) {
        var _this2 = this;

        var nextToken = this.nextToken;
        var word = this.currToken[1];
        while (nextToken && nextToken[0] === 'word') {
            this.position++;
            var current = this.currToken[1];
            word += current;
            if (current.lastIndexOf('\\') === current.length - 1) {
                var next = this.nextToken;
                if (next && next[0] === 'space') {
                    word += next[1];
                    this.position++;
                }
            }
            nextToken = this.nextToken;
        }
        var hasClass = (0, _indexesOf2.default)(word, '.');
        var hasId = (0, _indexesOf2.default)(word, '#');
        var indices = (0, _sortAscending2.default)((0, _uniq2.default)((0, _flatten2.default)([[0], hasClass, hasId])));
        indices.forEach(function (ind, i) {
            var index = indices[i + 1] || word.length;
            var value = word.slice(ind, index);
            if (i === 0 && firstCallback) {
                return firstCallback.call(_this2, value, indices.length);
            }
            var node = undefined;
            if (~hasClass.indexOf(ind)) {
                node = new _className2.default({
                    value: value.slice(1),
                    source: {
                        start: {
                            line: _this2.currToken[2],
                            column: _this2.currToken[3] + ind
                        },
                        end: {
                            line: _this2.currToken[4],
                            column: _this2.currToken[3] + (index - 1)
                        }
                    },
                    sourceIndex: _this2.currToken[6] + indices[i]
                });
            } else if (~hasId.indexOf(ind)) {
                node = new _id2.default({
                    value: value.slice(1),
                    source: {
                        start: {
                            line: _this2.currToken[2],
                            column: _this2.currToken[3] + ind
                        },
                        end: {
                            line: _this2.currToken[4],
                            column: _this2.currToken[3] + (index - 1)
                        }
                    },
                    sourceIndex: _this2.currToken[6] + indices[i]
                });
            } else {
                node = new _tag2.default({
                    value: value,
                    source: {
                        start: {
                            line: _this2.currToken[2],
                            column: _this2.currToken[3] + ind
                        },
                        end: {
                            line: _this2.currToken[4],
                            column: _this2.currToken[3] + (index - 1)
                        }
                    },
                    sourceIndex: _this2.currToken[6] + indices[i]
                });
            }
            _this2.newNode(node, namespace);
        });
        this.position++;
    };

    Parser.prototype.word = function word(namespace) {
        var nextToken = this.nextToken;
        if (nextToken && nextToken[1] === '|') {
            this.position++;
            return this.namespace();
        }
        return this.splitWord(namespace);
    };

    Parser.prototype.loop = function loop() {
        while (this.position < this.tokens.length) {
            this.parse(true);
        }
        return this.root;
    };

    Parser.prototype.parse = function parse(throwOnParenthesis) {
        switch (this.currToken[0]) {
            case 'space':
                this.space();
                break;
            case 'comment':
                this.comment();
                break;
            case '(':
                this.parentheses();
                break;
            case ')':
                if (throwOnParenthesis) {
                    this.missingParenthesis();
                }
                break;
            case '[':
                this.attribute();
                break;
            case ']':
                this.missingSquareBracket();
                break;
            case 'at-word':
            case 'word':
                this.word();
                break;
            case ':':
                this.pseudo();
                break;
            case ',':
                this.comma();
                break;
            case '*':
                this.universal();
                break;
            case 'combinator':
                this.combinator();
                break;
            case 'string':
                this.string();
                break;
        }
    };

    /**
     * Helpers
     */

    Parser.prototype.newNode = function newNode(node, namespace) {
        if (namespace) {
            node.namespace = namespace;
        }
        if (this.spaces) {
            node.spaces.before = this.spaces;
            this.spaces = '';
        }
        return this.current.append(node);
    };

    _createClass(Parser, [{
        key: 'currToken',
        get: function get() {
            return this.tokens[this.position];
        }
    }, {
        key: 'nextToken',
        get: function get() {
            return this.tokens[this.position + 1];
        }
    }, {
        key: 'prevToken',
        get: function get() {
            return this.tokens[this.position - 1];
        }
    }]);

    return Parser;
}();

exports.default = Parser;
module.exports = exports['default'];