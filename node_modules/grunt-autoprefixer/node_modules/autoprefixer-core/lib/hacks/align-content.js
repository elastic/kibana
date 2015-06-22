(function() {
  var AlignContent, Declaration, flexSpec,
    __hasProp = {}.hasOwnProperty,
    __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

  flexSpec = require('./flex-spec');

  Declaration = require('../declaration');

  AlignContent = (function(_super) {
    __extends(AlignContent, _super);

    function AlignContent() {
      return AlignContent.__super__.constructor.apply(this, arguments);
    }

    AlignContent.names = ['align-content', 'flex-line-pack'];

    AlignContent.oldValues = {
      'flex-end': 'end',
      'flex-start': 'start',
      'space-between': 'justify',
      'space-around': 'distribute'
    };

    AlignContent.prototype.prefixed = function(prop, prefix) {
      var spec, _ref;
      _ref = flexSpec(prefix), spec = _ref[0], prefix = _ref[1];
      if (spec === 2012) {
        return prefix + 'flex-line-pack';
      } else {
        return AlignContent.__super__.prefixed.apply(this, arguments);
      }
    };

    AlignContent.prototype.normalize = function(prop) {
      return 'align-content';
    };

    AlignContent.prototype.set = function(decl, prefix) {
      var spec;
      spec = flexSpec(prefix)[0];
      if (spec === 2012) {
        decl.value = AlignContent.oldValues[decl.value] || decl.value;
        return AlignContent.__super__.set.call(this, decl, prefix);
      } else if (spec === 'final') {
        return AlignContent.__super__.set.apply(this, arguments);
      }
    };

    return AlignContent;

  })(Declaration);

  module.exports = AlignContent;

}).call(this);
