define(function (require) {
  return function NumberFormatProvider(Private, config, $rootScope) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/field_format/field_format'));
    var numeral = require('numeral')();
    var baseTemplate;

    function updateBaseTemplate() {
      var prec = parseInt(config.get('format:numberPrecision'), 10);
      baseTemplate = '0' + ((prec > 0) ? '.[' + _.repeat('0', prec) + ']' : '');
    }

    updateBaseTemplate();
    $rootScope.$on('init:config', updateBaseTemplate);
    $rootScope.$on('change:config.format:numberPrecision', updateBaseTemplate);

    _(_Number).inherits(FieldFormat);
    function _Number(params) {
      _Number.Super.call(this, params);
    }

    _Number.id = 'number';
    _Number.title = 'Number';
    _Number.fieldType = 'number';

    _Number.prototype._units = '';
    _Number.prototype._convert = function (val) {
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val)) {
        return '';
      } else {
        return numeral.set(val).format(baseTemplate + this._units);
      }
    };

    return _Number;
  };
});
