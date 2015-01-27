define(function (require) {
  return function BaseNumeralFormatProvider(Private, config, $rootScope) {
    var _ = require('lodash');
    var format = Private(require('components/stringify/_format'));
    var numeral = require('numeral');

    return function numFormat(name, units) {
      var nu = numeral();
      var nuFormat; // set by updateTemplate()

      function updateTemplate() {
        var prec = parseInt(config.get('format:numberPrecision'), 10);
        nuFormat = '0' + ((prec > 0) ? '.[' + _.repeat('0', prec) + ']' : '') + units;
      }

      updateTemplate();
      $rootScope.$on('init:config', updateTemplate);
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