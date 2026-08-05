/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Wraps an object factory in a Proxy that defers construction of the underlying
 * object until any property is first accessed. The materialized object is cached
 * behind a `WeakRef`, so once no external consumer keeps it alive the GC is free
 * to reclaim it; the next access rebuilds it from the factory. Function-valued
 * properties are bound to the materialized object so methods observe a stable
 * `this`.
 *
 * Intended for cases where many objects are declared at module-load time but
 * only a subset is used at runtime. Unused entries stay as a single Proxy
 * instance plus a closure, keeping baseline heap low; transiently-used entries
 * are collectible after their last reference is dropped.
 *
 * Trade-off: if the same object is used repeatedly across GC cycles without
 * callers retaining a reference, each cycle pays the cost of rebuilding it.
 * Hold on to a reference (e.g. `const o = LazyThing; o.method(...)` inside a
 * hot path) if that matters. Writes (`obj.prop = ...`) and deletions throw.
 *
 * Caveat: `instanceof` checks on the returned value will be `false` because the
 * Proxy target is an empty object. Property enumeration (`Object.keys`,
 * `for...in`, spread) and descriptor lookups (`Object.getOwnPropertyDescriptor`)
 * reflect the materialized object; descriptors are coerced to `configurable: true`
 * to satisfy Proxy invariants against the empty target.
 */
export function lazyImmutableGCableObject<T extends object>(factory: () => T): T {
  let ref: WeakRef<T> | undefined;
  const materialize = (): T => {
    const cached = ref?.deref();
    if (cached) {
      return cached;
    }
    const fresh = factory();
    ref = new WeakRef(fresh);
    return fresh;
  };

  const self: T = new Proxy({} as T, {
    get(_target, prop) {
      const real = materialize() as unknown as Record<PropertyKey, unknown>;
      const value = real[prop];

      // zod's toJSONSchema registers the schema passed to process() in ctx.seen,
      // but _zod.processJSONSchema is a closure over `inst` (the real schema) and
      // passes it to the inner processor, which then does ctx.seen.get(inst).
      // Because proxy !== inst, the lookup returns undefined and crashes.
      // Fix: before calling the original processJSONSchema, alias the proxy's
      // ctx.seen entry under the real object's identity so both lookups hit it.
      if (
        prop === '_zod' &&
        value != null &&
        typeof (value as Record<PropertyKey, unknown>).processJSONSchema === 'function'
      ) {
        const originalPJS = (value as Record<PropertyKey, unknown>).processJSONSchema as (
          ...args: unknown[]
        ) => unknown;
        // Use Object.create to inherit the full _zod object (including non-enumerable
        // getters like `value`) rather than a spread which silently drops them.
        const wrapped = Object.create(value as object) as Record<PropertyKey, unknown>;
        wrapped.processJSONSchema = (
          ctx: { seen?: Map<unknown, unknown> },
          json: unknown,
          params: unknown
        ) => {
          if (ctx?.seen instanceof Map && ctx.seen.has(self) && !ctx.seen.has(real)) {
            ctx.seen.set(real, ctx.seen.get(self));
          }
          return originalPJS(ctx, json, params);
        };
        return wrapped;
      }

      if (typeof value === 'function') {
        return (value as (...args: unknown[]) => unknown).bind(real);
      }
      return value;
    },
    has(_target, prop) {
      return prop in (materialize() as unknown as object);
    },
    ownKeys(_target) {
      return Reflect.ownKeys(materialize() as unknown as object);
    },
    getOwnPropertyDescriptor(_target, prop) {
      const desc = Reflect.getOwnPropertyDescriptor(materialize() as unknown as object, prop);
      if (!desc) {
        return undefined;
      }
      // Proxy invariants require that any non-configurable property reported
      // here must also exist non-configurably on the target. Our target is an
      // empty `{}`, so coerce to `configurable: true` to stay consistent.
      return { ...desc, configurable: true };
    },
    set() {
      throw new Error('lazyImmutableGCableObject produces an immutable object');
    },
    defineProperty() {
      throw new Error('lazyImmutableGCableObject produces an immutable object');
    },
    deleteProperty() {
      throw new Error('lazyImmutableGCableObject produces an immutable object');
    },
  });

  return self;
}
