define(function (require) {
  return function StringFormatProvider(Private) {
    var _ = require('lodash');
    var format = Private(require('components/stringify/format'));

    return {
      name: 'string',
      fieldType: [
        'number',
        'boolean',
        'date',
        'ip',
        'attachment',
        'geo_point',
        'geo_shape',
        'string',
        'conflict'
      ],
      convert: format(_.asString)
    };
  };
});
