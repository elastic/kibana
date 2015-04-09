define(function (require) {
  return function NumberFormatProvider(Private) {
    var numFormat = Private(require('components/stringify/types/_num_format'));
    return numFormat('number', '');
  };
});
