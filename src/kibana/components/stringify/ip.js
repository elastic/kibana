define(function (require) {
  return function IpFormatProvider() {
    var format = require('components/stringify/_format');

    return {
      name: 'ip',
      fieldType: [
        'ip'
      ],
      convert: format(function (val) {
        if (!isFinite(val)) return val;
        // shazzam!
        return [val >>> 24, val >>> 16 & 0xFF, val >>> 8 & 0xFF, val & 0xFF].join('.');
      })
    };
  };
});