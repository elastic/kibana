/**
 * This is used for looking up function/argument definitions. It looks through
 * the given object for a case-insensitive match, which could be either the
 * name of the key itself, or something under the `aliases` property.
 */
export function getByAlias(specs, name) {
  const lowerCaseName = name.toLowerCase();
  const key = Object.keys(specs).find(key => {
    if (key.toLowerCase() === lowerCaseName) return true;
    return (specs[key].aliases || []).some(alias => {
      return alias.toLowerCase() === lowerCaseName;
    });
  });
  if (typeof key !== undefined) return specs[key];
}
