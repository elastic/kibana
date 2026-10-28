/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Cache the results of a single-argument function, including `undefined` results (e.g. a
 * missing file), so that every argument is computed only once.
 */
export function memoize<T, T2>(fn: (arg: T) => T2): (arg: T) => T2 {
  const cache = new Map<T, { value: T2 }>();

  return (arg) => {
    let entry = cache.get(arg);
    if (!entry) {
      entry = { value: fn(arg) };
      cache.set(arg, entry);
    }

    return entry.value;
  };
}
