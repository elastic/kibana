(function() {
  var BorderRadius, Declaration,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Declaration = require('../declaration');

  BorderRadius = (function(_super) {
    var hor, mozilla, normal, ver, _i, _j, _len, _len1, _ref, _ref1;

    __extends(BorderRadius, _super);

    function BorderRadius() {
      return BorderRadius.__super__.constructor.apply(this, arguments);
    }

    BorderRadius.names = ['border-radius'];

    BorderRadius.toMozilla = {};

    BorderRadius.toNormal = {};

    _ref = ['top', 'bottom'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      ver = _ref[_i];
      _ref1 = ['left', 'right'];
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        hor = _ref1[_j];
        normal = "border-" + ver + "-" + hor + "-radius";
        mozilla = "border-radius-" + ver + hor;
        BorderRadius.names.push(normal);
        BorderRadius.names.push(mozilla);
        BorderRadius.toMozilla[normal] = mozilla;
        BorderRadius.toNormal[mozilla] = normal;
      }
    }

    BorderRadius.prototype.prefixed = function(prop, prefix) {
      if (prefix === '-moz-') {
        return prefix + (BorderRadius.toMozilla[prop] || prop);
      } else {
        return BorderRadius.__super__.prefixed.apply(this, arguments);
      }
    };

    BorderRadius.prototype.normalize = function(prop) {
      return BorderRadius.toNormal[prop] || prop;
    };

    return BorderRadius;

  })(Declaration);

  module.exports = BorderRadius;

}).call(this);
