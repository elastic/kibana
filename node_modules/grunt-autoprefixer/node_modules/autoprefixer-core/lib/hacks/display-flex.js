(function() {
  var DisplayFlex, OldDisplayFlex, OldValue, Value, flexSpec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  flexSpec = require('./flex-spec');

  OldValue = require('../old-value');

  Value = require('../value');

  OldDisplayFlex = (function(_super) {
    __extends(OldDisplayFlex, _super);

    function OldDisplayFlex(name) {
      this.name = name;
    }

    OldDisplayFlex.prototype.check = function(value) {
      return value === this.name;
    };

    return OldDisplayFlex;

  })(OldValue);

  DisplayFlex = (function(_super) {
    __extends(DisplayFlex, _super);

    DisplayFlex.names = ['display-flex', 'inline-flex'];

    function DisplayFlex(name, prefixes) {
      DisplayFlex.__super__.constructor.apply(this, arguments);
      if (name === 'display-flex') {
        this.name = 'flex';
      }
    }

    DisplayFlex.prototype.check = function(decl) {
      return decl.value === this.name;
    };

    DisplayFlex.prototype.prefixed = function(prefix) {
      var spec, _ref;
      _ref = flexSpec(prefix), spec = _ref[0], prefix = _ref[1];
      return prefix + (spec === 2009 ? this.name === 'flex' ? 'box' : 'inline-box' : spec === 2012 ? this.name === 'flex' ? 'flexbox' : 'inline-flexbox' : spec === 'final' ? this.name : void 0);
    };

    DisplayFlex.prototype.replace = function(string, prefix) {
      return this.prefixed(prefix);
    };

    DisplayFlex.prototype.old = function(prefix) {
      var prefixed;
      prefixed = this.prefixed(prefix);
      if (prefixed) {
        return new OldValue(prefixed);
      }
    };

    return DisplayFlex;

  })(Value);

  module.exports = DisplayFlex;

}).call(this);
