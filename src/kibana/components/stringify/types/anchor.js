define(function (require) {
  return function AnchorFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/field_format/field_format'));

    _(Anchor).inherits(FieldFormat);
    function Anchor(params) {
      Anchor.Super.call(this, params);
    }

    Anchor.id = 'anchor';
    Anchor.title = 'Anchor';
    Anchor.fieldType = 'string';

    Anchor._convert = function (val) {
      return '<a href="' + val + '" target="_blank">' + val + '</a>';
    };

    return Anchor;
  };
});
