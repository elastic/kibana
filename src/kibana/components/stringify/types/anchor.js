define(function (require) {
  return function StringFormatProvider(Private) {
    var format = Private(require('components/stringify/format'));

    return {
      name: 'anchor',
      fieldType: [
        'string'
      ],
      convert: format(function (val) {
        return '<a href="' + val + '" target="_blank">' + val + '</a>';
      })
    };
  };
});
