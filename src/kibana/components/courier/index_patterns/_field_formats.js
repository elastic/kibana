define(function (require) {
  return function FieldFormattingService() {
    var _ = require('lodash');

    var formats = [
      {
        types: [
          'number',
          'date',
          'boolean',
          'ip',
          'attachment',
          'geo_point',
          'geo_shape',
          'string'
        ],
        name: 'string',
        fn: function (val) {
          if (_.isObject(val)) {
            return JSON.stringify(val);
          } else {
            return '' + val;
          }
        }
      }
    ];

    formats.byType = _.transform(formats, function (byType, formatter) {
      formatter.types.forEach(function (type) {
        var list = byType[type] || (byType[type] = []);
        list.push(formatter);
      });
    }, {});

    formats.byName = _.indexBy(formats, 'name');

    formats.defaultByType = {
      number:     formats.byName.string,
      date:       formats.byName.string,
      boolean:    formats.byName.string,
      ip:         formats.byName.string,
      attachment: formats.byName.string,
      geo_point:  formats.byName.string,
      geo_shape:  formats.byName.string,
      string:     formats.byName.string
    };

    return formats;
  };
});