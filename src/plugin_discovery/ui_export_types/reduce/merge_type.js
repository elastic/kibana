/**
 *  Creates a reducer that merges the values within `acc[type]` by calling
 *  `merge` with `(acc[type], spec, type, pluginSpec)`
 *  @param  {Function} merge receives `(acc[type], spec, type, pluginSpec)`
 *  @return {Function}
 */
export const mergeType = (merge) => (acc, spec, type, pluginSpec) => ({
  ...acc,
  [type]: merge(acc[type], spec, type, pluginSpec)
});
