/**
 *  Combine the exportSpecs from a list of pluginSpecs
 *  by calling the reducers for each export type
 *  @param {Array<PluginSpecs>} pluginSpecs
 *  @param {Object<exportType,reducer>} reducers
 *  @param {Object<exportType,exports>} [defaults={}]
 *  @return {Object<exportType,exports>}
 */
export function reduceExportSpecs(pluginSpecs, reducers, defaults = {}) {
  return pluginSpecs.reduce((acc, pluginSpec) => {
    const specsByType = pluginSpec.getExportSpecs() || {};
    const types = Object.keys(specsByType);

    return types.reduce((acc, type) => {
      const reducer = (reducers[type] || reducers.unknown);

      if (!reducer) {
        throw new Error(`Unknown export type ${type}`);
      }

      // convert specs to an array if not already one or
      // ignore the spec if it is undefined
      const specs = [].concat(
        specsByType[type] === undefined
          ? []
          : specsByType[type]
      );

      return specs.reduce((acc, spec) => (
        reducer(acc, spec, type, pluginSpec)
      ), acc);
    }, acc);
  }, defaults);
}
