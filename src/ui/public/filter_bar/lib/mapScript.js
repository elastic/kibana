define(function () {
  var {FieldNotFoundInCache} = require('ui/errors');

  return function mapScriptProvider(Promise, courier) {
    return function (filter) {
      var key;
      var value;
      var field;
      if (filter.script) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = filter.meta.field;
          field = indexPattern.fields.byName[key];
          if (!field) return Promise.reject(new FieldNotFoundInCache(key));

          if (filter.meta.formattedValue) {
            value = filter.meta.formattedValue;
          } else {
            value = filter.script.params.value;
            value = field.format.convert(value);
          }

          return { key: key, value: value };
        });
      }
      return Promise.reject(filter);
    };
  };
});
