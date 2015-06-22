(function() {
  var TransformValue, Value,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Value = require('../value');

  TransformValue = (function(_super) {
    __extends(TransformValue, _super);

    function TransformValue() {
      return TransformValue.__super__.constructor.apply(this, arguments);
    }

    TransformValue.names = ['transform'];

    TransformValue.prototype.replace = function(value, prefix) {
      if (prefix === '-ms-') {
        return value;
      } else {
        return TransformValue.__super__.replace.apply(this, arguments);
      }
    };

    return TransformValue;

  })(Value);

  module.exports = TransformValue;

}).call(this);
