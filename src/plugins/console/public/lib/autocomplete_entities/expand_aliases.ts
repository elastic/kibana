/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { getAutocompleteInfo } from '../../services';

export function expandAliases(indicesOrAliases: string | string[]) {
  // takes a list of indices or aliases or a string which may be either and returns a list of indices
  // returns a list for multiple values or a string for a single.
  const perAliasIndexes = getAutocompleteInfo().alias.perAliasIndexes;
  if (!indicesOrAliases) {
    return indicesOrAliases;
  }

  if (typeof indicesOrAliases === 'string') {
    indicesOrAliases = [indicesOrAliases];
  }

  indicesOrAliases = indicesOrAliases.flatMap((iOrA) => {
    if (perAliasIndexes[iOrA]) {
      return perAliasIndexes[iOrA];
    }
    return [iOrA];
  });

  let ret = ([] as string[]).concat.apply([], indicesOrAliases);
  ret.sort();
  ret = ret.reduce((result, value, index, array) => {
    const last = array[index - 1];
    if (last !== value) {
      result.push(value);
    }
    return result;
  }, [] as string[]);

  return ret.length > 1 ? ret : ret[0];
}
