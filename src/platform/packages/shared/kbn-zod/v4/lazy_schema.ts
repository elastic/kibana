/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazyImmutableGCableObject } from './lazy_immutable_gcable_object';

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

/**
 * Zod-typed wrapper for generated schemas (e.g. from `@kbn/openapi-generator`).
 *
 * Default behavior: defers construction of the schema until any property
 * (`.parse`, `.safeParse`, `.extend`, `.optional`, ...) is first accessed, and
 * lets the GC reclaim the materialized schema once no consumer is holding a
 * reference (see `lazyImmutableGCableObject`).
 *
 * When disabled via `setLazySchemaEnabled(false)`: calls the factory eagerly
 * at wrap time and returns the real schema object, bypassing the Proxy and
 * GC-eligibility machinery entirely.
 *
 * Caveat (Proxy mode only): chaining e.g. Schema.optional().nullable() will
 * again retain the memory.
 *
 * Caveat (Proxy mode only): `instanceof z.ZodObject` / `instanceof z.ZodType`
 * on the returned value will be `false` because the Proxy target is an empty
 * object. Zod's own internals and typical consumers use structural `_zod` /
 * `.def` checks rather than `instanceof`, so this is safe in practice.
 */
export const lazySchema = <T extends object>(factory: () => T): T =>
  disabled ? factory() : lazyImmutableGCableObject(factory);
