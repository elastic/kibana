define(function (require) {
  return function BytesFormatProvider(Private) {
    var Numeral = Private(require('components/stringify/types/_Numeral'));
    return Numeral.factory({
      id: 'bytes',
      title: 'Bytes',
      sampleInputs: [1024, 5150000, 1990000000]
    });
  };
});
