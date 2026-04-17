/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as z4 from 'zod/v4';

/**
 * Wraps a Zod schema factory in a Proxy that defers construction of the
 * underlying schema until any property (including `.parse`, `.safeParse`,
 * `.extend`, `.optional`, etc.) is first accessed. The materialized schema
 * is memoized, so subsequent accesses reuse it.
 *
 * Intended for generated schemas (e.g. from `@kbn/openapi-generator`) where
 * many schemas are declared at module-load time but only a subset is used
 * at runtime. Unused schemas stay as a single Proxy instance plus a closure,
 * keeping baseline heap low.
 *
 * Caveat: `instanceof z.ZodObject` / `instanceof z.ZodType` on the returned
 * value will be `false` because the Proxy target is an empty object. Zod's
 * own internals and typical consumers use structural `_zod` / `.def` checks
 * rather than `instanceof`, so this is safe in practice.
 */
export function lazySchema<T extends z4.ZodType>(factory: () => T): T {
  let instance: T | undefined;
  const materialize = (): T => (instance ??= factory());

  return new Proxy({} as T, {
    get(_target, prop) {
      const real = materialize() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop];
      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(real);
      }
      return value;
    },
    has(_target, prop) {
      return prop in (materialize() as unknown as object);
    },
  });
}
