define(function (require) {
  return function PercentageFormatProvider(Private) {
    var numFormat = Private(require('components/stringify/_num_format'));
    return numFormat('percentage', '%');
  };
});