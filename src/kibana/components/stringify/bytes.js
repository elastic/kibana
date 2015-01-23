define(function (require) {
  return function BytesFormatProvider(config) {
    var format = require('components/stringify/_format');

    return {
      name: 'bytes',
      fieldTypes: 'number',
      convert: format(function (val) {
        return (val / 1024).toFixed(config.get('format:numberPrecision')) + ' kb';
      })
    };
  };
});