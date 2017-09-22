export function FilterBarLibMapScriptProvider(Promise) {
  return function (filter) {
    if (filter.script) {
      const type = 'scripted';
      const key = filter.meta.field;

      let value = '';
      if (filter.meta.formattedValue) {
        value = filter.meta.formattedValue;
      }

      return Promise.resolve({ type, key, value });
    }
    return Promise.reject(filter);
  };
}
