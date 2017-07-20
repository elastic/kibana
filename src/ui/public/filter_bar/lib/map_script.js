export function FilterBarLibMapScriptProvider(Promise, courier) {
  return function (filter) {
    if (filter.script) {
      return courier
      .indexPatterns
      .get(filter.meta.index).then(function (indexPattern) {
        const type = 'scripted';
        const key = filter.meta.field;
        const field = indexPattern.fields.byName[key];

        let value;
        if (filter.meta.formattedValue) {
          value = filter.meta.formattedValue;
        } else {
          value = filter.script.script.params.value;
          value = field.format.convert(value);
        }

        return { type, key, value };
      });
    }
    return Promise.reject(filter);
  };
}
