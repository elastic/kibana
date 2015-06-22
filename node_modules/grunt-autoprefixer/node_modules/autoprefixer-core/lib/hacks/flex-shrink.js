(function() {
  var Declaration, FlexShrink, flexSpec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  flexSpec = require('./flex-spec');

  Declaration = require('../declaration');

  FlexShrink = (function(_super) {
    __extends(FlexShrink, _super);

    function FlexShrink() {
      return FlexShrink.__super__.constructor.apply(this, arguments);
    }

    FlexShrink.names = ['flex-shrink', 'flex-negative'];

    FlexShrink.prototype.normalize = function() {
      return 'flex-shrink';
    };

    FlexShrink.prototype.prefixed = function(prop, prefix) {
      var spec, _ref;
      _ref = flexSpec(prefix), spec = _ref[0], prefix = _ref[1];
      if (spec === 2012) {
        return prefix + 'flex-negative';
      } else {
        return FlexShrink.__super__.prefixed.apply(this, arguments);
      }
    };

    FlexShrink.prototype.set = function(decl, prefix) {
      var spec, _ref;
      _ref = flexSpec(prefix), spec = _ref[0], prefix = _ref[1];
      if (spec === 2012 || spec === 'final') {
        return FlexShrink.__super__.set.apply(this, arguments);
      }
    };

    return FlexShrink;

  })(Declaration);

  module.exports = FlexShrink;

}).call(this);
