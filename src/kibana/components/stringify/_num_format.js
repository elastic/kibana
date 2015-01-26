define(function (require) {
  return function BaseNumeralFormatProvider(Private, config, $rootScope) {
    var _ = require('lodash');
    var format = Private(require('components/stringify/_format'));
    var numeral = require('numeral');

    return function numFormat(name, nuFormatTemplate) {
      var nu = numeral();
      var nuFormat = nuFormatTemplate; // replaced by updateTemplate()

      function updateTemplate() {
        var prec = '[' + _.repeat('0', config.get('format:numberPrecision')) + ']';
        nuFormat = nuFormat.replace('[]', prec);
      }

      updateTemplate();
      $rootScope.$on('change:config.format:numberPrecision', updateTemplate);

      return {
        name: name,
        fieldType: 'number',
        convert: format(function (val) {
          return nu.set(val).format(nuFormat);
        })
      };
    };
  };
});