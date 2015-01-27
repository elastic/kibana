define(function (require) {
  return function NumberFormatProvider(Private) {
    var numFormat = Private(require('components/stringify/_num_format'));
    return numFormat('number', '');
  };
});