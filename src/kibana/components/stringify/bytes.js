define(function (require) {
  return function BytesFormatProvider(Private) {
    var numFormat = Private(require('components/stringify/_num_format'));
    return numFormat('bytes', 'b');
  };
});