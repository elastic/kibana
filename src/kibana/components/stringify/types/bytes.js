define(function (require) {
  return function BytesFormatProvider(Private) {
    var numFormat = Private(require('components/stringify/types/_num_format'));
    return numFormat('bytes', 'b');
  };
});
