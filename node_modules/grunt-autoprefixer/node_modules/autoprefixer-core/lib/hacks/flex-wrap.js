(function() {
  var Declaration, FlexWrap, flexSpec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  flexSpec = require('./flex-spec');

  Declaration = require('../declaration');

  FlexWrap = (function(_super) {
    __extends(FlexWrap, _super);

    function FlexWrap() {
      return FlexWrap.__super__.constructor.apply(this, arguments);
    }

    FlexWrap.names = ['flex-wrap'];

    FlexWrap.prototype.set = function(decl, prefix) {
      var spec;
      spec = flexSpec(prefix)[0];
      if (spec !== 2009) {
        return FlexWrap.__super__.set.apply(this, arguments);
      }
    };

    return FlexWrap;

  })(Declaration);

  module.exports = FlexWrap;

}).call(this);
