define(function (require) {
  return function IpFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/index_patterns/_field_format/FieldFormat'));

    _(Ip).inherits(FieldFormat);
    function Ip(params) {
      Ip.Super.call(this, params);
    }

    Ip.id = 'ip';
    Ip.title = 'IP Address';
    Ip.fieldType = 'ip';

    Ip.prototype._convert = function (val) {
      if (!isFinite(val)) return val;

      // shazzam!
      return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
    };

    return Ip;
  };
});
