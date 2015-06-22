(function() {
  var Placeholder, Selector,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Selector = require('../selector');

  Placeholder = (function(_super) {
    __extends(Placeholder, _super);

    function Placeholder() {
      return Placeholder.__super__.constructor.apply(this, arguments);
    }

    Placeholder.names = ['::placeholder'];

    Placeholder.prototype.possible = function() {
      return Placeholder.__super__.possible.apply(this, arguments).concat('-moz- old');
    };

    Placeholder.prototype.prefixed = function(prefix) {
      if ('-webkit-' === prefix) {
        return '::-webkit-input-placeholder';
      } else if ('-ms-' === prefix) {
        return ':-ms-input-placeholder';
      } else if ('-moz- old' === prefix) {
        return ':-moz-placeholder';
      } else {
        return "::" + prefix + "placeholder";
      }
    };

    return Placeholder;

  })(Selector);

  module.exports = Placeholder;

}).call(this);
