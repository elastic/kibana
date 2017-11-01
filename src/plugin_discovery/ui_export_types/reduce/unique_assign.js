export function uniqueAssign(acc, spec, type, pluginSpec) {
  return Object.keys(spec).reduce((acc, key) => {
    if (acc.hasOwnProperty(key)) {
      throw new Error(`${pluginSpec.getId()} defines a duplicate ${type} for key ${key}`);
    }

    return {
      ...acc,
      [key]: spec[key]
    };
  }, acc);
}
