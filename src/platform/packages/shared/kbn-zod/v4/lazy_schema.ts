/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  isMaterializingLazyObject,
  lazyImmutableGCableObject,
} from './lazy_immutable_gcable_object';

let disabled = false;

/**
 * Disables the lazy-wrapping behavior of `lazySchema`. When `true`,
 * `lazySchema` calls its factory eagerly at wrap time and returns the real
 * schema object (no Proxy, no WeakRef). When `false` (the default), schemas
 * are wrapped lazily.
 *
 * Caveat: in typical Kibana plugin layouts, generated schema modules are
 * imported at plugin-module-load time — which runs before `setup()` returns.
 * Call this as early as possible (e.g. from a static config read before plugin
 * construction) if you need it to affect module-load-time wraps.
 */
export const setLazySchemaDisabled = (value: boolean): void => {
  disabled = value;
};

export const isLazySchemaDisabled = (): boolean => disabled;

/**
 * Zod-typed wrapper for generated schemas (e.g. from `@kbn/openapi-generator`).
 *
 * Default behavior: defers construction of the schema until any property
 * (`.parse`, `.safeParse`, `.shape`, ...) is first accessed, preserves laziness
 * across chainable modifiers (`.optional()`, `.nullable()`, `.describe()`,
 * `.meta()`, `.extend()`, ...), and lets the GC reclaim the materialized schema
 * once no consumer is holding a reference (see `lazyImmutableGCableObject`).
 *
 * When disabled via `setLazySchemaDisabled(true)`: calls the factory eagerly
 * at wrap time and returns the real schema object, bypassing the Proxy and
 * GC-eligibility machinery entirely.
 *
 * `instanceof z.ZodObject` / `instanceof z.ZodType` keep working in Proxy mode:
 * Zod resolves `instanceof` via `Symbol.hasInstance` against `_zod.traits`,
 * and the Proxy forwards `_zod` to the materialized schema.
 */
export const lazySchema = <T extends object>(factory: () => T): T =>
  disabled || isMaterializingLazyObject()
    ? factory()
    : lazyImmutableGCableObject(factory, {
        isZodSchema: true,
        wrapChainable: lazySchema,
      });

class WeakSchemaIdMap extends Map<string, unknown> {
  override set(key: string, value: unknown): this {
    if (value != null && typeof value === 'object') {
      super.set(key, new WeakRef(value));
    }
    return this;
  }

  override get(key: string): unknown {
    const ref = super.get(key) as WeakRef<object> | undefined;
    if (!ref) {
      return undefined;
    }
    const deref = ref.deref();
    if (!deref) {
      super.delete(key);
    }
    return deref;
  }

  override has(key: string): boolean {
    return this.get(key) !== undefined;
  }

  override *entries(): MapIterator<[string, unknown]> {
    for (const [key, ref] of super.entries()) {
      const deref = (ref as WeakRef<object>)?.deref?.();
      if (deref !== undefined) {
        yield [key, deref];
      } else {
        super.delete(key);
      }
    }
  }

  override *values(): MapIterator<unknown> {
    for (const [, value] of this.entries()) {
      yield value;
    }
  }

  override [Symbol.iterator](): MapIterator<[string, unknown]> {
    return this.entries();
  }
}

/**
 * Converts `z.globalRegistry._idmap` to hold `WeakRef`s so schemas registered
 * with `.meta({ id })` remain garbage-collectable after use.
 */
export const installWeakGlobalRegistryIdMap = (globalRegistry?: { _idmap?: unknown }): void => {
  if (
    globalRegistry &&
    globalRegistry._idmap instanceof Map &&
    !(globalRegistry._idmap instanceof WeakSchemaIdMap)
  ) {
    const weakMap = new WeakSchemaIdMap();
    for (const [k, v] of (globalRegistry._idmap as Map<string, unknown>).entries()) {
      weakMap.set(k, v);
    }
    globalRegistry._idmap = weakMap;
  }
};
