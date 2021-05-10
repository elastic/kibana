/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * Attempt to apply basic webpack alias transformations so we can
 * avoid triggering the webpack resolver for many imports
 *
 * @param {string} source
 * @param {Array<[alias,path]>} aliasEntries
 * @return {string|undefined}
 */
exports.resolveWebpackAlias = function (source, aliasEntries) {
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
