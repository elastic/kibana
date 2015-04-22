define(function (require) {
  return function NumberFormatProvider(Private) {
    var Numeral = Private(require('components/stringify/types/_Numeral'));
    return Numeral.factory({
      id: 'number',
      title: 'Number',
      samples: [
        10000, 10000.23, 10000.23, -10000, 10000.1234,
        10000.1234, -10000, -0.23, -0.23, 0.23, 0.23,
        1230974, 1460, -104000, 1, 52, 23, 100
      ]
    });
  };
});
