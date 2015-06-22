(function() {
  var Declaration, TransformDecl,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  Declaration = require('../declaration');

  TransformDecl = (function(_super) {
    __extends(TransformDecl, _super);

    function TransformDecl() {
      return TransformDecl.__super__.constructor.apply(this, arguments);
    }

    TransformDecl.names = ['transform', 'transform-origin'];

    TransformDecl.functions3d = ['matrix3d', 'translate3d', 'translateZ', 'scale3d', 'scaleZ', 'rotate3d', 'rotateX', 'rotateY', 'rotateZ', 'perspective'];

    TransformDecl.prototype.keykrameParents = function(decl) {
      var parent;
      parent = decl.parent;
      while (parent) {
        if (parent.type === 'atrule' && parent.name === 'keyframes') {
          return true;
        }
        parent = parent.parent;
      }
      return false;
    };

    TransformDecl.prototype.contain3d = function(decl) {
      var func, _i, _len, _ref;
      if (decl.prop === 'transform-origin') {
        return false;
      }
      _ref = TransformDecl.functions3d;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        func = _ref[_i];
        if (decl.value.indexOf("" + func + "(") !== -1) {
          return true;
        }
      }
      return false;
    };

    TransformDecl.prototype.insert = function(decl, prefix, prefixes) {
      if (prefix === '-ms-') {
        if (!this.contain3d(decl) && !this.keykrameParents(decl)) {
          return TransformDecl.__super__.insert.apply(this, arguments);
        }
      } else if (prefix === '-o-') {
        if (!this.contain3d(decl)) {
          return TransformDecl.__super__.insert.apply(this, arguments);
        }
      } else {
        return TransformDecl.__super__.insert.apply(this, arguments);
      }
    };

    return TransformDecl;

  })(Declaration);

  module.exports = TransformDecl;

}).call(this);
