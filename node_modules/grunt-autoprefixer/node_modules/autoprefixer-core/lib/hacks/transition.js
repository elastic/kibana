(function() {
  var OldValue, Transition, Value,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  OldValue = require('../old-value');

  Value = require('../value');

  Transition = (function(_super) {
    __extends(Transition, _super);

    function Transition() {
      return Transition.__super__.constructor.apply(this, arguments);
    }

    Transition.names = ['flex', 'flex-grow', 'flex-shrink', 'flex-basis'];

    Transition.prototype.prefixed = function(prefix) {
      return this.all.prefixed(this.name, prefix);
    };

    Transition.prototype.replace = function(string, prefix) {
      return string.replace(this.regexp(), '$1' + this.prefixed(prefix) + '$3');
    };

    Transition.prototype.old = function(prefix) {
      return new OldValue(this.prefixed(prefix));
    };

    return Transition;

  })(Value);

  module.exports = Transition;

}).call(this);
