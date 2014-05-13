define(function (require) {
  return function FieldTypesComponent(Private) {
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

    window.kibanaFieldTypes = fieldTypes;

    return fieldTypes;
  };
});