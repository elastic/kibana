define(function (require) {
  return function NumberFormatProvider(config) {
    var _ = require('lodash');
    var format = require('components/stringify/_format');

    return {
      name: 'number',
      fieldType: 'number',
      convert: format(function (val) {
        if (_.isNumber(val)) {
          return +val.toFixed(config.get('format:numberPrecision'));
        } else {
          return _.asString(val);
        }
      })
    };
  };
});