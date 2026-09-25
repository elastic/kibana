/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export function memoize<T, T2>(fn: (arg: T) => T2): (arg: T) => T2 {
  const cache = new Map<T, T2>();

  return (arg) => {
    // `has` rather than an `undefined` check: `undefined` results (e.g. missing paths) must be cached too
    if (cache.has(arg)) {
      return cache.get(arg) as T2;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
