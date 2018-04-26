/**
 * Attempt to apply basic webpack alias transfomations so we can
 * avoid triggering the webpack resolver for many imports
 *
 * @param {string} source
 * @param {Array<[alias,path]>} aliasEntries
 * @return {string|undefined}
 */
exports.resolveWebpackAlias = function(source, aliasEntries) {
  for (const [alias, path] of aliasEntries) {
    if (source === alias) {
      return path;
    }

    if (alias.endsWith('$')) {
      if (source === alias.slice(0, -1)) {
        return path;
      }
    } else if (source.startsWith(alias + '/')) {
      return path + '/' + source.slice(alias.length + 1);
    }
  }
};
