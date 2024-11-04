/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { escapeRegExp, memoize } from 'lodash';

// @internal
export const makeRegEx = memoize(function makeRegEx(glob: string) {
  const globRegex = glob.split('*').map(escapeRegExp).join('.*');
  return new RegExp(`^${globRegex}$`);
});

// Note that this will return an essentially noop function if globs is undefined.
export function fieldWildcardMatcher(globs: string[] = [], metaFields: unknown[] = []) {
  return function matcher(val: unknown) {
    // do not test metaFields or keyword
    if (metaFields.indexOf(val) !== -1) {
      return false;
    }
    return globs.some((p) => makeRegEx(p).test(`${val}`));
  };
}

// Note that this will return an essentially noop function if globs is undefined.
export function fieldWildcardFilter(globs: string[] = [], metaFields: string[] = []) {
  const matcher = fieldWildcardMatcher(globs, metaFields);
  return function filter(val: unknown) {
    return !matcher(val);
  };
}
