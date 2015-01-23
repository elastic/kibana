define(function (require) {
  return function StringFormatProvider() {
    var _ = require('lodash');
    var format = require('components/stringify/_format');

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