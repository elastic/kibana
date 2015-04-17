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

    NumeralJs.editor = {
      template: require('text!components/stringify/editors/NumeralJs.html'),
      controllerAs: 'cntrl',
      controller: function ($scope) {
        var self = this;
        var examples = [
          10000, 10000.23, 10000.23, -10000, 10000.1234,
          10000.1234, -10000, -0.23, -0.23, 0.23, 0.23,
          1230974, 1460, -104000, 1, 52, 23, 100
        ];

        self.samples = [];
        $scope.$watch('format.param("format")', function (pattern) {
          if (pattern) {
            self.samples = examples.map(function (input) {
              return [input, $scope.format.convert(input)];
            });
          } else {
            self.samples = null;
          }
        });
      }
    };

    return NumeralJs;
  };
});
