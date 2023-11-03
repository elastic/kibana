/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// TODO: memoize should be done in getCapabilitiesResolver
// (pathA: string, pathB: string) => `${pathA}|${pathB}`
export const pathsIntersect = (pathA: string, pathB: string): boolean => {
  const splitA = pathA.split('.');
  const splitB = pathB.split('.');
  const minLength = Math.min(splitA.length, splitB.length);

  for (let i = 0; i < minLength; i++) {
    const segA = splitA[i];
    const segB = splitB[i];
    if (segA === '*' || segB === '*') {
      return true;
    }
    if (segA !== segB) {
      return false;
    }
  }
  return false;
};
