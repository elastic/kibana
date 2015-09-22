'use strict';

exports.__esModule = true;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _node = require('./node');

var _node2 = _interopRequireDefault(_node);

var Comment = (function (_Node) {
    function Comment(defaults) {
        _classCallCheck(this, Comment);

        _Node.call(this, defaults);
        this.type = 'comment';
    }

    _inherits(Comment, _Node);

    Comment.prototype.stringify = function stringify(builder) {
        var before = this.style('before');
        if (before) builder(before);
        var left = this.style('left', 'commentLeft');
        var right = this.style('right', 'commentRight');
        builder('/*' + left + this.text + right + '*/', this);
    };

    return Comment;
})(_node2['default']);

exports['default'] = Comment;
module.exports = exports['default'];