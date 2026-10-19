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
const LAZY_STATE = Symbol.for('@kbn/zod/lazyState');

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
  'loose',
  'merge',
  'nonoptional',
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
  'prefault',
  'readonly',
  'refine',
  'required',
  'strict',
  'strip',
  'superRefine',
  'transform',
]);

// Wrapper methods that simply wrap the outer schema (`this`) as `innerType`
// without mutating or cloning `this`. Passing `state.p` (the proxy) as `this`
// keeps the proxy identity intact inside `def.innerType`.
const SELF_RECEIVER_ZOD_METHODS = new Set([
  'and',
  'array',
  'catch',
  'default',
  'exactOptional',
  'nonoptional',
  'nullable',
  'nullish',
  'optional',
  'or',
  'pipe',
  'prefault',
  'readonly',
  'transform',
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
  readonly onMaterialize?: (proxy: object, real: object) => void;
}

interface LazyState<T extends object> {
  f: () => T;
  r?: WeakRef<T>;
  wZod?: WeakRef<Record<PropertyKey, unknown>>;
  p: T;
  z?: boolean;
  w?: <U extends object>(factory: () => U) => U;
  m?: (proxy: object, real: object) => void;
}

interface LazyTarget<T extends object> {
  [LAZY_STATE]: LazyState<T>;
}

function materializeState<T extends object>(state: LazyState<T>): T {
  const cached = state.r?.deref();
  if (cached) {
    return cached;
  }
  materializingDepth++;
  try {
    let fresh = state.f();
    let guard = 0;
    while (
      fresh != null &&
      typeof fresh === 'object' &&
      guard++ < 32 &&
      typeof (fresh as Record<PropertyKey, unknown>)[LAZY_OBJECT_MATERIALIZE] === 'function'
    ) {
      fresh = (fresh as Record<PropertyKey, () => T>)[LAZY_OBJECT_MATERIALIZE]();
    }
    state.r = new WeakRef(fresh);
    state.wZod = undefined;
    state.m?.(state.p, fresh);
    return fresh;
  } finally {
    materializingDepth--;
  }
}

function getWrappedZod<T extends object>(
  state: LazyState<T>,
  real: Record<PropertyKey, unknown>,
  rawZod: Record<PropertyKey, unknown>
): Record<PropertyKey, unknown> {
  const cached = state.wZod?.deref();
  if (cached) {
    return cached;
  }

  const originalPJS = rawZod.processJSONSchema as (...args: unknown[]) => unknown;
  const self = state.p;
  // Use Object.create to inherit the full _zod object (including non-enumerable
  // getters like `value`) rather than a spread which silently drops them.
  const wrapped = Object.create(rawZod) as Record<PropertyKey, unknown>;
  wrapped.processJSONSchema = (
    ctx: {
      seen?: Map<unknown, unknown>;
      metadataRegistry?: {
        has(k: unknown): boolean;
        get(k: unknown): unknown;
        add(k: unknown, v: unknown): void;
      };
      __kbnLazyProxyToReal?: Map<unknown, unknown>;
      __kbnLazyRealToProxy?: Map<unknown, unknown>;
    },
    json: unknown,
    params: unknown
  ) => {
    if (ctx?.seen instanceof Map && ctx.seen.has(self) && !ctx.seen.has(real)) {
      const seenEntry = ctx.seen.get(self);
      // Place `real` before `self` in Map insertion order so `finalize()`'s
      // reverse iteration visits `self` (the proxy) first for `ctx.override`.
      ctx.seen.delete(self);
      ctx.seen.set(real, seenEntry);
      ctx.seen.set(self, seenEntry);
    }
    if (
      ctx?.metadataRegistry != null &&
      (ctx.metadataRegistry.has(real) || ctx.metadataRegistry.has(self))
    ) {
      let proxyToReal = ctx.__kbnLazyProxyToReal;
      let realToProxy = ctx.__kbnLazyRealToProxy;
      if (!proxyToReal || !realToProxy) {
        proxyToReal = new Map<unknown, unknown>();
        realToProxy = new Map<unknown, unknown>();
        ctx.__kbnLazyProxyToReal = proxyToReal;
        ctx.__kbnLazyRealToProxy = realToProxy;
        const orig = ctx.metadataRegistry;
        ctx.metadataRegistry = {
          has: (k: unknown) => orig.has(k) || orig.has(proxyToReal!.get(k) ?? k),
          get: (k: unknown) => {
            const proxyForReal = realToProxy!.get(k);
            if (proxyForReal !== undefined) {
              const meta = orig.get(k) ?? orig.get(proxyForReal);
              // When `self` was processed first, `real` and `self` share the same
              // `ctx.seen` entry; strip `id` on `real` so `self` owns the `$defs` entry.
              if (
                ctx.seen?.has(proxyForReal) &&
                ctx.seen.get(proxyForReal) === ctx.seen.get(k) &&
                meta != null &&
                typeof meta === 'object' &&
                'id' in meta
              ) {
                const { id: _id, ...rest } = meta as Record<string, unknown>;
                return Object.keys(rest).length ? rest : undefined;
              }
              return meta;
            }
            const realForProxy = proxyToReal!.get(k);
            if (realForProxy !== undefined) {
              const meta = orig.get(realForProxy) ?? orig.get(k);
              // When `real` was processed first (e.g. via `_zod.parent` of a `.meta()`
              // clone), `real` and `self` have distinct `ctx.seen` entries; strip `id`
              // on `self` so `real` (the parent) owns the `$defs` entry.
              if (
                ctx.seen?.has(realForProxy) &&
                ctx.seen.get(realForProxy) !== ctx.seen.get(k) &&
                meta != null &&
                typeof meta === 'object' &&
                'id' in meta
              ) {
                const { id: _id, ...rest } = meta as Record<string, unknown>;
                return Object.keys(rest).length ? rest : undefined;
              }
              return meta;
            }
            return orig.get(k);
          },
          add: (k: unknown, v: unknown) => orig.add(k, v),
        };
      }
      proxyToReal.set(self, real);
      realToProxy.set(real, self);
    }
    return originalPJS(ctx, json, params);
  };

  state.wZod = new WeakRef(wrapped);
  return wrapped;
}

const SHARED_PROXY_HANDLER: ProxyHandler<LazyTarget<object>> = {
  get(target, prop) {
    const state = target[LAZY_STATE];
    if (prop === LAZY_OBJECT_MATERIALIZE) {
      return () => materializeState(state);
    }
    if (state.z && prop === LAZY_ZOD_SCHEMA) {
      return true;
    }
    if (prop !== LAZY_STATE && Object.prototype.hasOwnProperty.call(target, prop)) {
      return Reflect.get(target, prop);
    }
    if (state.z && prop === 'register') {
      return (registry: { add?: (s: unknown, m: unknown) => void }, ...args: unknown[]) => {
        const real = materializeState(state) as unknown as {
          register: (r: unknown, ...a: unknown[]) => unknown;
        };
        real.register(registry, ...args);
        if (registry && typeof registry.add === 'function') {
          registry.add(state.p, args[0]);
        }
        return state.p;
      };
    }
    if (state.z && state.w && materializingDepth === 0) {
      if (prop === 'meta') {
        return (...args: unknown[]) => {
          if (args.length === 0) {
            return (materializeState(state) as unknown as { meta: () => unknown }).meta();
          }
          return state.w!(() =>
            (materializeState(state) as unknown as { meta: (...a: unknown[]) => object }).meta(
              ...args
            )
          );
        };
      }
      if (typeof prop === 'string' && CHAINABLE_ZOD_METHODS.has(prop)) {
        return (...args: unknown[]) =>
          state.w!(() => {
            const real = materializeState(state) as unknown as Record<
              string,
              (...a: unknown[]) => object
            >;
            const fn = real[prop];
            if (typeof fn !== 'function') {
              throw new TypeError(`schema.${prop} is not a function`);
            }
            const receiver = SELF_RECEIVER_ZOD_METHODS.has(prop) ? state.p : real;
            return fn.apply(receiver, args);
          });
      }
    }

    const real = materializeState(state) as unknown as Record<PropertyKey, unknown>;
    const value = real[prop];

    if (
      prop === '_zod' &&
      value != null &&
      typeof (value as Record<PropertyKey, unknown>).processJSONSchema === 'function'
    ) {
      return getWrappedZod(state, real, value as Record<PropertyKey, unknown>);
    }

    if (typeof value === 'function' && prop !== 'constructor') {
      return (value as (...args: unknown[]) => unknown).bind(real);
    }
    return value;
  },
  getPrototypeOf(target) {
    return Reflect.getPrototypeOf(materializeState(target[LAZY_STATE]) as unknown as object);
  },
  has(target, prop) {
    const state = target[LAZY_STATE];
    if (prop === LAZY_OBJECT_MATERIALIZE) {
      return true;
    }
    if (state.z && (prop === LAZY_ZOD_SCHEMA || prop === '_zod')) {
      return true;
    }
    if (prop !== LAZY_STATE && Object.prototype.hasOwnProperty.call(target, prop)) {
      return true;
    }
    return prop in (materializeState(state) as unknown as object);
  },
  ownKeys(target) {
    const realKeys = Reflect.ownKeys(materializeState(target[LAZY_STATE]) as unknown as object);
    const targetKeys = Reflect.ownKeys(target).filter((k) => k !== LAZY_STATE);
    return targetKeys.length > 0 ? Array.from(new Set([...realKeys, ...targetKeys])) : realKeys;
  },
  getOwnPropertyDescriptor(target, prop) {
    if (prop !== LAZY_STATE && Object.prototype.hasOwnProperty.call(target, prop)) {
      return Reflect.getOwnPropertyDescriptor(target, prop);
    }
    const desc = Reflect.getOwnPropertyDescriptor(
      materializeState(target[LAZY_STATE]) as unknown as object,
      prop
    );
    if (!desc) {
      return undefined;
    }
    return { ...desc, configurable: true };
  },
  set() {
    throw new Error('lazyImmutableGCableObject produces an immutable object');
  },
  defineProperty(target, prop, descriptor) {
    if (target[LAZY_STATE].z) {
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
  const state: LazyState<T> = {
    f: factory,
    r: undefined,
    wZod: undefined,
    p: undefined!,
    z: options?.isZodSchema,
    w: options?.wrapChainable,
    m: options?.onMaterialize,
  };
  const target: LazyTarget<T> = {
    [LAZY_STATE]: state,
  };
  const self = new Proxy(
    target as unknown as T,
    SHARED_PROXY_HANDLER as unknown as ProxyHandler<T>
  );
  state.p = self;
  return self;
}
