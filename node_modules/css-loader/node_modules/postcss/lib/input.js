'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _cssSyntaxError = require('./css-syntax-error');

var _cssSyntaxError2 = _interopRequireDefault(_cssSyntaxError);

var _previousMap = require('./previous-map');

var _previousMap2 = _interopRequireDefault(_previousMap);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var sequence = 0;

var Input = (function () {
    function Input(css) {
        var opts = arguments[1] === undefined ? {} : arguments[1];

        _classCallCheck(this, Input);

        this.css = css.toString();

        if (this.css[0] === '﻿' || this.css[0] === '￾') {
            this.css = this.css.slice(1);
        }

        this.safe = !!opts.safe;

        if (opts.from) this.file = _path2['default'].resolve(opts.from);

        var map = new _previousMap2['default'](this.css, opts, this.id);
        if (map.text) {
            this.map = map;
            var file = map.consumer().file;
            if (!this.file && file) this.file = this.mapResolve(file);
        }

        if (this.file) {
            this.from = this.file;
        } else {
            sequence += 1;
            this.id = '<input css ' + sequence + '>';
            this.from = this.id;
        }
        if (this.map) this.map.file = this.from;
    }

    Input.prototype.error = function error(message, line, column) {
        var opts = arguments[3] === undefined ? {} : arguments[3];

        var error = new _cssSyntaxError2['default'](message);

        var origin = this.origin(line, column);
        if (origin) {
            error = new _cssSyntaxError2['default'](message, origin.line, origin.column, origin.source, origin.file, opts.plugin);
        } else {
            error = new _cssSyntaxError2['default'](message, line, column, this.css, this.file, opts.plugin);
        }

        error.generated = {
            line: line,
            column: column,
            source: this.css
        };
        if (this.file) error.generated.file = this.file;

        return error;
    };

    Input.prototype.origin = function origin(line, column) {
        if (!this.map) return false;
        var consumer = this.map.consumer();

        var from = consumer.originalPositionFor({ line: line, column: column });
        if (!from.source) return false;

        var result = {
            file: this.mapResolve(from.source),
            line: from.line,
            column: from.column
        };

        var source = consumer.sourceContentFor(result.file);
        if (source) result.source = source;

        return result;
    };

    Input.prototype.mapResolve = function mapResolve(file) {
        return _path2['default'].resolve(this.map.consumer().sourceRoot || '.', file);
    };

    return Input;
})();

exports['default'] = Input;
module.exports = exports['default'];