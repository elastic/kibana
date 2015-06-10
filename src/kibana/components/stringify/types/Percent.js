define(function (require) {
  return function NumberFormatProvider(Private) {
    var _ = require('lodash');
    var BoundToConfigObj = Private(require('components/bound_to_config_obj'));
    var Numeral = Private(require('components/stringify/types/_Numeral'));

    return Numeral.factory({
      id: 'percent',
      title: 'Percentage',
      paramDefaults: new BoundToConfigObj({
        pattern: '=format:percent:defaultPattern',
        fractional: true
      }),
      sampleInputs: [
        0.10, 0.99999, 1, 100, 1000
      ],
      prototype: {
        _convert: _.compose(Numeral.prototype._convert, function (val) {
          return this.param('fractional') ? val : val / 100;
        })
      }
    });
  };
});
