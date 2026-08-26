/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Like lodash `once`, but only caches successful results. If the factory throws,
 * the next call retries rather than returning the cached failure (undefined).
 * This prevents silent bypasses when deferred construction fails on the first
 * call — subsequent calls will consistently fail with an error instead of
 * silently returning undefined.
 *
 * @public
 */
export function onceCacheOnSuccess<T>(factory: () => T): () => T {
  let cached: T | undefined;
  let built = false;
  return () => {
    if (!built) {
      cached = factory(); // throws → built stays false, next call retries
      built = true;
    }
    return cached as T;
  };
}
