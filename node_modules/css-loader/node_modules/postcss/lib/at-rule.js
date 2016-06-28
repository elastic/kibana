'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _container = require('./container');

var _container2 = _interopRequireDefault(_container);

var AtRule = (function (_Container) {
    function AtRule(defaults) {
        _classCallCheck(this, AtRule);

        _Container.call(this, defaults);
        this.type = 'atrule';
    }

    _inherits(AtRule, _Container);

    AtRule.prototype.stringify = function stringify(builder, semicolon) {
        var name = '@' + this.name;
        var params = this.params ? this.stringifyRaw('params') : '';

        if (typeof this.afterName !== 'undefined') {
            name += this.afterName;
        } else if (params) {
            name += ' ';
        }

        if (this.nodes) {
            this.stringifyBlock(builder, name + params);
        } else {
            var before = this.style('before');
            if (before) builder(before);
            var end = (this.between || '') + (semicolon ? ';' : '');
            builder(name + params + end, this);
        }
    };

    AtRule.prototype.append = function append(child) {
        if (!this.nodes) this.nodes = [];
        return _Container.prototype.append.call(this, child);
    };

    AtRule.prototype.prepend = function prepend(child) {
        if (!this.nodes) this.nodes = [];
        return _Container.prototype.prepend.call(this, child);
    };

    AtRule.prototype.insertBefore = function insertBefore(exist, add) {
        if (!this.nodes) this.nodes = [];
        return _Container.prototype.insertBefore.call(this, exist, add);
    };

    AtRule.prototype.insertAfter = function insertAfter(exist, add) {
        if (!this.nodes) this.nodes = [];
        return _Container.prototype.insertAfter.call(this, exist, add);
    };

    return AtRule;
})(_container2['default']);

exports['default'] = AtRule;
module.exports = exports['default'];