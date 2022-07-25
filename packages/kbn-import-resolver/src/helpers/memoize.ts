/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export function memoize<T, T2>(fn: (arg: T) => T2): (arg: T) => T2 {
  const cache = new Map<T, T2>();

  return (arg) => {
    const cached = cache.get(arg);
    if (cached !== undefined) {
      return cached;
    }

    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}
