(function() {
  var FilterValue, Value,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Value = require('../value');

  FilterValue = (function(_super) {
    __extends(FilterValue, _super);

    function FilterValue() {
      return FilterValue.__super__.constructor.apply(this, arguments);
    }

    FilterValue.names = ['filter'];

    FilterValue.prototype.replace = function(value, prefix) {
      if (prefix === '-webkit-') {
        if (value.indexOf('-webkit-filter') === -1) {
          return FilterValue.__super__.replace.apply(this, arguments) + ', ' + value;
        } else {
          return value;
        }
      } else {
        return FilterValue.__super__.replace.apply(this, arguments);
      }
    };

    return FilterValue;

  })(Value);

  module.exports = FilterValue;

}).call(this);
