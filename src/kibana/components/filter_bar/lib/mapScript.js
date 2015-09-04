define(function () {
  return function mapScriptProvider(Promise, courier) {
    return function (filter) {
      var key, value, field;
      if (filter.script) {
        return courier
        .indexPatterns
        .get(filter.meta.index).then(function (indexPattern) {
          key = filter.meta.field;
          field = indexPattern.fields.byName[key];

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
