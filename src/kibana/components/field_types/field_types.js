define(function (require) {
  return function FieldTypesComponent(Private) {
    var _ = require('lodash');

    var fieldTypes = {
      number: Private(require('./types/number')),
      date: Private(require('./types/date')),
      boolean: Private(require('./types/boolean')),
      ip: Private(require('./types/ip')),
      attachment: Private(require('./types/attachment')),
      geo_point: Private(require('./types/geo_point')),
      geo_shape: Private(require('./types/geo_shape')),
      string: Private(require('./types/string'))
    };

    Object.defineProperty(fieldTypes, 'keyFor', {
      enumerable: false,
      value: function (constructor) {
        var key;
        Object.keys(fieldTypes).some(function (k) {
          if (fieldTypes[k] === constructor) {
            key = k;
            return true;
          }
        });
        return key;
      }
    });

    window.fieldTypes = fieldTypes;
    window.KbnNumber = fieldTypes.number;
    window.KbnDate = fieldTypes.date;
    window.KbnBoolean = fieldTypes.boolean;
    window.KbnIp = fieldTypes.ip;
    window.KbnAttachment = fieldTypes.attachment;
    window.KbnGeoPoint = fieldTypes.geo_point;
    window.KbnGeoShape = fieldTypes.geo_point;
    window.KbnString = fieldTypes.string;

    return fieldTypes;
  };
});