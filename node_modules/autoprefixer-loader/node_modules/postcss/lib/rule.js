'use strict';

exports.__esModule = true;

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _container = require('./container');

var _container2 = _interopRequireDefault(_container);

var _list = require('./list');

var _list2 = _interopRequireDefault(_list);

var Rule = (function (_Container) {
    function Rule(defaults) {
        _classCallCheck(this, Rule);

        _Container.call(this, defaults);
        if (!this.nodes) this.nodes = [];
        this.type = 'rule';
    }

    _inherits(Rule, _Container);

    Rule.prototype.stringify = function stringify(builder) {
        this.stringifyBlock(builder, this.stringifyRaw('selector'));
    };

    _createClass(Rule, [{
        key: 'selectors',
        get: function get() {
            return _list2['default'].comma(this.selector);
        },
        set: function set(values) {
            this.selector = values.join(', ');
        }
    }]);

    return Rule;
})(_container2['default']);

exports['default'] = Rule;
module.exports = exports['default'];