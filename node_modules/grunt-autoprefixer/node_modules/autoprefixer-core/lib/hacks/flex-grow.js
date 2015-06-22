(function() {
  var Declaration, Flex, flexSpec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  flexSpec = require('./flex-spec');

  Declaration = require('../declaration');

  Flex = (function(_super) {
    __extends(Flex, _super);

    function Flex() {
      return Flex.__super__.constructor.apply(this, arguments);
    }

    Flex.names = ['flex-grow', 'flex-positive'];

    Flex.prototype.normalize = function() {
      return 'flex';
    };

    Flex.prototype.prefixed = function(prop, prefix) {
      var spec, _ref;
      _ref = flexSpec(prefix), spec = _ref[0], prefix = _ref[1];
      if (spec === 2009) {
        return prefix + 'box-flex';
      } else if (spec === 2012) {
        return prefix + 'flex-positive';
      } else {
        return Flex.__super__.prefixed.apply(this, arguments);
      }
    };

    return Flex;

  })(Declaration);

  module.exports = Flex;

}).call(this);
