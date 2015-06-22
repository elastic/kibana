(function() {
  var BackgroundSize, Declaration,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Declaration = require('../declaration');

  BackgroundSize = (function(_super) {
    __extends(BackgroundSize, _super);

    function BackgroundSize() {
      return BackgroundSize.__super__.constructor.apply(this, arguments);
    }

    BackgroundSize.names = ['background-size'];

    BackgroundSize.prototype.set = function(decl, prefix) {
      var value;
      value = decl.value.toLowerCase();
      if (prefix === '-webkit-' && value.indexOf(' ') === -1 && value !== 'contain' && value !== 'cover') {
        decl.value = decl.value + ' ' + decl.value;
      }
      return BackgroundSize.__super__.set.call(this, decl, prefix);
    };

    return BackgroundSize;

  })(Declaration);

  module.exports = BackgroundSize;

}).call(this);
