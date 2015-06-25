define(function (require) {
  return function NumberFormatProvider(Private) {
    var Numeral = Private(require('components/stringify/types/_Numeral'));
    return Numeral.factory({
      id: 'number',
      title: 'Number',
      sampleInputs: [
        10000, 12.345678, -1, -999, 0.52
      ]
    });
  };
});
