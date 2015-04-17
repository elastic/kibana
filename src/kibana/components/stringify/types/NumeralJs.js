define(function (require) {
  return function NumberFormatProvider(Private) {
    var _ = require('lodash');
    var FieldFormat = Private(require('components/field_format/field_format'));
    var numeral = require('numeral')();

    _(NumeralJs).inherits(FieldFormat);
    function NumeralJs(params) {
      NumeralJs.Super.call(this, params);
    }

    NumeralJs.id = 'nujs';
    NumeralJs.title = 'numeral.js';
    NumeralJs.fieldType = 'number';

    NumeralJs.editor = require('text!components/stringify/editors/NumeralJs.html');
    NumeralJs.defaultParams = {
      format: '0,0'
    };

    NumeralJs.prototype._convert = function (val) {
      if (typeof val !== 'number') {
        val = parseFloat(val);
      }

      if (isNaN(val)) {
        return '';
      } else {
        return numeral.set(val).format(this.param('format'));
      }
    };

    return NumeralJs;
  };
});
