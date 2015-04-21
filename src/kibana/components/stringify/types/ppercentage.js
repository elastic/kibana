define(function (require) {
  return function PercentageFormatProvider(Private) {
    var _ = require('lodash');
    var Number = Private(require('components/stringify/types/Number'));

    _(Percentage).inherits(Number);
    function Percentage(params) {
      Percentage.Super.call(this, params);
    }

    Percentage.id = 'percent';
    Percentage.title = 'Percentage';
    Percentage.fieldType = 'number';

    Percentage.prototype._units = '%';

    return Percentage;
  };
});
