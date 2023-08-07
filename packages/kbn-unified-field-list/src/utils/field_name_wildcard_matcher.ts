/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { escapeRegExp, memoize } from 'lodash';

const makeRegEx = memoize(function makeRegEx(glob: string) {
  const globRegex = glob.split('*').map(escapeRegExp).join('.*');
  return new RegExp(globRegex.includes('*') ? `^${globRegex}$` : globRegex, 'i');
});

/**
 * Checks if field displayName or name matches the provided search string.
 * The search string can have wildcard.
 * @param field
 * @param fieldSearchHighlight
 */
export const fieldNameWildcardMatcher = (
  field: { name: string; displayName?: string },
  fieldSearchHighlight: string
): boolean => {
  if (!fieldSearchHighlight) {
    return false;
  }

  return (
    (!!field.displayName && makeRegEx(fieldSearchHighlight).test(field.displayName)) ||
    makeRegEx(fieldSearchHighlight).test(field.name)
  );
};
