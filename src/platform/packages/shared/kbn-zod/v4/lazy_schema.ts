/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { globalRegistry } from 'zod/v4';
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

const syncProxyRegistryMetadata = (proxy: object, real: object): void => {
  const proxyMeta = globalRegistry.get(proxy as any);
  if (proxyMeta !== undefined && !globalRegistry.has(real as any)) {
    globalRegistry.add(real as any, proxyMeta);
  }
};

/**
 * Zod-typed wrapper for generated and module-scope schemas.
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
        onMaterialize: syncProxyRegistryMetadata,
      });
