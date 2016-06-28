'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _jsBase64 = require('js-base64');

var _sourceMap = require('source-map');

var _sourceMap2 = _interopRequireDefault(_sourceMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _default = (function () {
    var _class = function _default(root, opts) {
        _classCallCheck(this, _class);

        this.root = root;
        this.opts = opts;
        this.mapOpts = opts.map || {};
    };

    _class.prototype.isMap = function isMap() {
        if (typeof this.opts.map !== 'undefined') {
            return !!this.opts.map;
        } else {
            return this.previous().length > 0;
        }
    };

    _class.prototype.previous = function previous() {
        var _this = this;

        if (!this.previousMaps) {
            this.previousMaps = [];
            this.root.eachInside(function (node) {
                if (node.source && node.source.input.map) {
                    var map = node.source.input.map;
                    if (_this.previousMaps.indexOf(map) === -1) {
                        _this.previousMaps.push(map);
                    }
                }
            });
        }

        return this.previousMaps;
    };

    _class.prototype.isInline = function isInline() {
        if (typeof this.mapOpts.inline !== 'undefined') {
            return this.mapOpts.inline;
        }

        var annotation = this.mapOpts.annotation;
        if (typeof annotation !== 'undefined' && annotation !== true) {
            return false;
        }

        if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.inline;
            });
        } else {
            return true;
        }
    };

    _class.prototype.isSourcesContent = function isSourcesContent() {
        if (typeof this.mapOpts.sourcesContent !== 'undefined') {
            return this.mapOpts.sourcesContent;
        }
        if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.withContent();
            });
        } else {
            return true;
        }
    };

    _class.prototype.clearAnnotation = function clearAnnotation() {
        if (this.mapOpts.annotation === false) return;

        var node = undefined;
        for (var i = this.root.nodes.length - 1; i >= 0; i--) {
            node = this.root.nodes[i];
            if (node.type !== 'comment') continue;
            if (node.text.indexOf('# sourceMappingURL=') === 0) {
                this.root.remove(i);
            }
        }
    };

    _class.prototype.setSourcesContent = function setSourcesContent() {
        var _this2 = this;

        var already = {};
        this.root.eachInside(function (node) {
            if (node.source) {
                var from = node.source.input.from;
                if (from && !already[from]) {
                    already[from] = true;
                    var relative = _this2.relative(from);
                    _this2.map.setSourceContent(relative, node.source.input.css);
                }
            }
        });
    };

    _class.prototype.applyPrevMaps = function applyPrevMaps() {
        for (var _iterator = this.previous(), _isArray = Array.isArray(_iterator), _i = 0, _iterator = _isArray ? _iterator : _iterator[Symbol.iterator]();;) {
            var _ref;

            if (_isArray) {
                if (_i >= _iterator.length) break;
                _ref = _iterator[_i++];
            } else {
                _i = _iterator.next();
                if (_i.done) break;
                _ref = _i.value;
            }

            var prev = _ref;

            var from = this.relative(prev.file);
            var root = prev.root || _path2['default'].dirname(prev.file);
            var map = undefined;

            if (this.mapOpts.sourcesContent === false) {
                map = new _sourceMap2['default'].SourceMapConsumer(prev.text);
                if (map.sourcesContent) {
                    map.sourcesContent = map.sourcesContent.map(function () {
                        return null;
                    });
                }
            } else {
                map = prev.consumer();
            }

            this.map.applySourceMap(map, from, this.relative(root));
        }
    };

    _class.prototype.isAnnotation = function isAnnotation() {
        if (this.isInline()) {
            return true;
        } else if (typeof this.mapOpts.annotation !== 'undefined') {
            return this.mapOpts.annotation;
        } else if (this.previous().length) {
            return this.previous().some(function (i) {
                return i.annotation;
            });
        } else {
            return true;
        }
    };

    _class.prototype.addAnnotation = function addAnnotation() {
        var content = undefined;

        if (this.isInline()) {
            content = 'data:application/json;base64,' + _jsBase64.Base64.encode(this.map.toString());
        } else if (typeof this.mapOpts.annotation === 'string') {
            content = this.mapOpts.annotation;
        } else {
            content = this.outputFile() + '.map';
        }

        this.css += '\n/*# sourceMappingURL=' + content + ' */';
    };

    _class.prototype.outputFile = function outputFile() {
        if (this.opts.to) {
            return this.relative(this.opts.to);
        } else if (this.opts.from) {
            return this.relative(this.opts.from);
        } else {
            return 'to.css';
        }
    };

    _class.prototype.generateMap = function generateMap() {
        this.stringify();
        if (this.isSourcesContent()) this.setSourcesContent();
        if (this.previous().length > 0) this.applyPrevMaps();
        if (this.isAnnotation()) this.addAnnotation();

        if (this.isInline()) {
            return [this.css];
        } else {
            return [this.css, this.map];
        }
    };

    _class.prototype.relative = function relative(file) {
        var from = this.opts.to ? _path2['default'].dirname(this.opts.to) : '.';

        if (typeof this.mapOpts.annotation === 'string') {
            from = _path2['default'].dirname(_path2['default'].resolve(from, this.mapOpts.annotation));
        }

        file = _path2['default'].relative(from, file);
        if (_path2['default'].sep === '\\') {
            return file.replace(/\\/g, '/');
        } else {
            return file;
        }
    };

    _class.prototype.sourcePath = function sourcePath(node) {
        return this.relative(node.source.input.from);
    };

    _class.prototype.stringify = function stringify() {
        var _this3 = this;

        this.css = '';
        this.map = new _sourceMap2['default'].SourceMapGenerator({ file: this.outputFile() });

        var line = 1;
        var column = 1;

        var lines = undefined,
            last = undefined;
        var builder = function builder(str, node, type) {
            _this3.css += str;

            if (node && node.source && node.source.start && type !== 'end') {
                _this3.map.addMapping({
                    source: _this3.sourcePath(node),
                    original: {
                        line: node.source.start.line,
                        column: node.source.start.column - 1
                    },
                    generated: {
                        line: line,
                        column: column - 1
                    }
                });
            }

            lines = str.match(/\n/g);
            if (lines) {
                line += lines.length;
                last = str.lastIndexOf('\n');
                column = str.length - last;
            } else {
                column = column + str.length;
            }

            if (node && node.source && node.source.end && type !== 'start') {
                _this3.map.addMapping({
                    source: _this3.sourcePath(node),
                    original: {
                        line: node.source.end.line,
                        column: node.source.end.column
                    },
                    generated: {
                        line: line,
                        column: column - 1
                    }
                });
            }
        };

        this.root.stringify(builder);
    };

    _class.prototype.generate = function generate() {
        this.clearAnnotation();

        if (this.isMap()) {
            return this.generateMap();
        } else {
            return [this.root.toString()];
        }
    };

    return _class;
})();

exports['default'] = _default;
module.exports = exports['default'];