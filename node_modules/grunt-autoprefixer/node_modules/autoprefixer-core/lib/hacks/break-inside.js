(function() {
  var BreakInside, Declaration,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Declaration = require('../declaration');

  BreakInside = (function(_super) {
    __extends(BreakInside, _super);

    function BreakInside() {
      return BreakInside.__super__.constructor.apply(this, arguments);
    }

    BreakInside.names = ['break-inside', 'page-break-inside', 'column-break-inside'];

    BreakInside.prototype.prefixed = function(prop, prefix) {
      if (prefix === '-webkit-') {
        return prefix + 'column-break-inside';
      } else if (prefix === '-moz-') {
        return 'page-break-inside';
      } else {
        return BreakInside.__super__.prefixed.apply(this, arguments);
      }
    };

    BreakInside.prototype.normalize = function() {
      return 'break-inside';
    };

    BreakInside.prototype.set = function(decl, prefix) {
      if (decl.value === 'avoid-column' || decl.value === 'avoid-page') {
        decl.value = 'avoid';
      }
      return BreakInside.__super__.set.apply(this, arguments);
    };

    BreakInside.prototype.insert = function(decl, prefix, prefixes) {
      if (decl.value === 'avoid-region') {

      } else if (decl.value === 'avoid-page' && prefix === '-webkit-') {

      } else {
        return BreakInside.__super__.insert.apply(this, arguments);
      }
    };

    return BreakInside;

  })(Declaration);

  module.exports = BreakInside;

}).call(this);
