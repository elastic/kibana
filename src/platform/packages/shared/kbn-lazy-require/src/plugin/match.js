/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const path = require('path');
// eslint-disable-next-line import/no-extraneous-dependencies
const resolve = require('resolve');

/**
 * @param {import('./types').Pattern} part
 * @return {( filename?:string ) => boolean }
 */
function toMatcher(part) {
  if (typeof part === 'string') {
    return (filename) => part === '*' || filename.includes(part);
  }
  return (filename) => part.test(filename);
}

/**
 *
 * Matches names (filenames and specifiers) against allowlist
 * and excludelist.
 *
 * @param {import('./types').Pattern[] | undefined} include
 * @param {import('./types').Pattern[] | undefined} exclude
 * @param {boolean} includeAllByDefault
 * @returns {( filename?:string ) => boolean}
 */
module.exports = function (include, exclude, includeAllByDefault = true) {
  const includeMatchers = include?.map(toMatcher);
  const excludeMatchers = exclude?.map(toMatcher);

  function matchName(name) {
    if (!name) {
      return { included: false, excluded: false };
    }

    const included = includeMatchers?.length
      ? includeMatchers.some((matcher) => matcher(name))
      : includeAllByDefault;

    const excluded = excludeMatchers?.length
      ? excludeMatchers.some((matcher) => matcher(name))
      : false;

    return {
      included,
      excluded,
    };
  }

  return function match(filename) {
    const matchRaw = matchName(filename);

    if (matchRaw.excluded) {
      return false;
    }

    if (matchRaw.included) {
      return true;
    }

    if (resolve.isCore(filename) || path.isAbsolute(filename)) {
      return false;
    }

    try {
      const result = matchName(require.resolve(filename));
      return result.included && !result.excluded;
    } catch (err) {
      return false;
    }
  };
};
