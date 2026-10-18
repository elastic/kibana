/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export const LAZY_OBJECT_MATERIALIZE = Symbol.for('@kbn/zod/lazyObjectMaterialize');
export const LAZY_ZOD_SCHEMA = Symbol.for('@kbn/zod/lazyZodSchema');

const CHAINABLE_ZOD_METHODS = new Set([
  'and',
  'array',
  'brand',
  'catch',
  'catchall',
  'check',
  'default',
  'describe',
  'exactOptional',
  'extend',
  'gt',
  'gte',
  'int',
  'length',
  'lt',
  'lte',
  'max',
  'merge',
  'min',
  'multipleOf',
  'negative',
  'nonempty',
  'nonnegative',
  'nonoptional',
  'nonpositive',
  'nullable',
  'nullish',
  'omit',
  'optional',
  'or',
  'overwrite',
  'partial',
  'passthrough',
  'pick',
  'pipe',
  'positive',
  'prefault',
  'readonly',
  'refine',
  'regex',
  'register',
  'required',
  'strict',
  'strip',
  'superRefine',
  'toLowerCase',
  'toUpperCase',
  'transform',
  'trim',
]);

let materializingDepth = 0;

/**
 * Returns `true` while a `lazyImmutableGCableObject` factory is actively
 * materializing its target object.
 */
export const isMaterializingLazyObject = (): boolean => materializingDepth > 0;

export interface LazyImmutableGCableObjectOptions {
  readonly isZodSchema?: boolean;
  readonly wrapChainable?: <U extends object>(factory: () => U) => U;
}

interface LazyTarget<T extends object> {
  f: () => T;
  r?: WeakRef<T>;
  p?: Proxy<T>;
  z?: boolean;
  w?: <U extends object>(factory: () => U) => U;
}

type Proxy<T extends object> = T;

function materializeTarget<T extends object>(target: LazyTarget<T>): T {
  const cached = target.r?.deref();
  if (cached) {
    return cached;
  }
  materializingDepth++;
  try {
    let fresh = target.f();
    while (
      fresh != null &&
      typeof fresh === 'object' &&
      typeof (fresh as Record<PropertyKey, unknown>)[LAZY_OBJECT_MATERIALIZE] === 'function'
    ) {
      fresh = (fresh as Record<PropertyKey, () => T>)[LAZY_OBJECT_MATERIALIZE]();
    }
    target.r = new WeakRef(fresh);
    return fresh;
  } finally {
    materializingDepth--;
  }
}

const SHARED_PROXY_HANDLER: ProxyHandler<LazyTarget<object>> = {
  get(target, prop) {
    if (prop === LAZY_OBJECT_MATERIALIZE) {
      return () => materializeTarget(target);
    }
    if (target.z && prop === LAZY_ZOD_SCHEMA) {
      return true;
    }
    if (
      prop !== 'f' &&
      prop !== 'r' &&
      prop !== 'p' &&
      prop !== 'z' &&
      prop !== 'w' &&
      Object.prototype.hasOwnProperty.call(target, prop)
    ) {
      return Reflect.get(target, prop);
    }
    if (target.z && target.w && materializingDepth === 0) {
      if (prop === 'meta') {
        return (...args: unknown[]) => {
          if (args.length === 0) {
            return (materializeTarget(target) as unknown as { meta: () => unknown }).meta();
          }
          return target.w!(() =>
            (materializeTarget(target) as unknown as { meta: (...a: unknown[]) => object }).meta(
              ...args
            )
          );
        };
      }
      if (typeof prop === 'string' && CHAINABLE_ZOD_METHODS.has(prop)) {
        return (...args: unknown[]) =>
          target.w!(() =>
            (materializeTarget(target) as unknown as Record<string, (...a: unknown[]) => object>)[
              prop
            ](...args)
          );
      }
    }

    const real = materializeTarget(target) as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];
    const self = target.p;

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
        ctx: {
          seen?: Map<unknown, unknown>;
          metadataRegistry?: {
            has(k: unknown): boolean;
            get(k: unknown): unknown;
            add(k: unknown, v: unknown): void;
          };
          __kbnLazyProxyMap?: Map<unknown, unknown>;
        },
        json: unknown,
        params: unknown
      ) => {
        let addedRealToSeen = false;
        if (ctx?.seen instanceof Map && ctx.seen.has(self) && !ctx.seen.has(real)) {
          ctx.seen.set(real, ctx.seen.get(self));
          addedRealToSeen = true;
        }
        // process() calls metadataRegistry.get(proxy) after processJSONSchema returns
        // to merge title/description into the output. The registry is keyed by real
        // object identity so the proxy lookup would miss. Rather than mutating the
        // global registry (ctx.metadataRegistry defaults to zod's module singleton),
        // shadow it on ctx once with a map-backed wrapper that redirects proxy lookups to real.
        if (
          ctx?.metadataRegistry != null &&
          ctx.metadataRegistry.has(real) &&
          !ctx.metadataRegistry.has(self)
        ) {
          let proxyMap = ctx.__kbnLazyProxyMap;
          if (!proxyMap) {
            proxyMap = new Map<unknown, unknown>();
            ctx.__kbnLazyProxyMap = proxyMap;
            const orig = ctx.metadataRegistry;
            ctx.metadataRegistry = {
              has: (k: unknown) => orig.has(proxyMap!.get(k) ?? k),
              get: (k: unknown) => {
                const mapped = proxyMap!.get(k);
                const meta = orig.get(mapped ?? k);
                // Strip `id` when returning metadata for the proxy only if `real` is
                // also separately present in `ctx.seen` (e.g. via `_zod.parent` from a
                // `.meta()` clone), so `extractDefs` does not see the same `id` twice.
                if (
                  mapped !== undefined &&
                  ctx.seen?.has(mapped) &&
                  meta != null &&
                  typeof meta === 'object' &&
                  'id' in meta
                ) {
                  const { id: _id, ...rest } = meta as Record<string, unknown>;
                  return Object.keys(rest).length ? rest : undefined;
                }
                return meta;
              },
              add: (k: unknown, v: unknown) => orig.add(k, v),
            };
          }
          proxyMap.set(self, real);
        }
        try {
          return originalPJS(ctx, json, params);
        } finally {
          if (addedRealToSeen && ctx?.seen && ctx.seen.get(real) === ctx.seen.get(self)) {
            ctx.seen.delete(real);
          }
        }
      };
      return wrapped;
    }

    if (typeof value === 'function') {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
  has(target, prop) {
    if (prop === LAZY_OBJECT_MATERIALIZE) {
      return true;
    }
    if (target.z && (prop === LAZY_ZOD_SCHEMA || prop === '_zod')) {
      return true;
    }
    return prop in (materializeTarget(target) as unknown as object);
  },
  ownKeys(target) {
    return Reflect.ownKeys(materializeTarget(target) as unknown as object);
  },
  getOwnPropertyDescriptor(target, prop) {
    const desc = Reflect.getOwnPropertyDescriptor(
      materializeTarget(target) as unknown as object,
      prop
    );
    if (!desc) {
      return undefined;
    }
    // Proxy invariants require that any non-configurable property reported
    // here must also exist non-configurably on the target.
    return { ...desc, configurable: true };
  },
  set() {
    throw new Error('lazyImmutableGCableObject produces an immutable object');
  },
  defineProperty(target, prop, descriptor) {
    if (target.z) {
      return Reflect.defineProperty(target, prop, descriptor);
    }
    throw new Error('lazyImmutableGCableObject produces an immutable object');
  },
  deleteProperty() {
    throw new Error('lazyImmutableGCableObject produces an immutable object');
  },
};

/**
 * Wraps an object factory in a Proxy that defers construction of the underlying
 * object until any property is first accessed. The materialized object is cached
 * behind a `WeakRef`, so once no external consumer keeps it alive the GC is free
 * to reclaim it; the next access rebuilds it from the factory.
 */
export function lazyImmutableGCableObject<T extends object>(
  factory: () => T,
  options?: LazyImmutableGCableObjectOptions
): T {
  const target: LazyTarget<T> = {
    f: factory,
    r: undefined,
    p: undefined,
    z: options?.isZodSchema,
    w: options?.wrapChainable,
  };
  const self = new Proxy(
    target as unknown as T,
    SHARED_PROXY_HANDLER as unknown as ProxyHandler<T>
  );
  target.p = self;
  return self;
}
