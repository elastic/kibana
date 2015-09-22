(function() {
  var Appearance, Declaration,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  Declaration = require('../declaration');

  Appearance = (function(superClass) {
    extend(Appearance, superClass);

    function Appearance() {
      return Appearance.__super__.constructor.apply(this, arguments);
    }

    Appearance.names = ['appearance'];

    Appearance.prototype.check = function(decl) {
      return decl.value.toLowerCase() === 'none';
    };

    return Appearance;

  })(Declaration);

  module.exports = Appearance;

}).call(this);
