/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { lazyGCableObject } from '@kbn/lazy-object/src/lazy_gcable_object';

/**
 * Zod-typed wrapper around `lazyGCableObject` for generated schemas
 * (e.g. from `@kbn/openapi-generator`). Defers construction of the schema
 * until any property (`.parse`, `.safeParse`, `.extend`, `.optional`, ...)
 * is first accessed, and lets the GC reclaim the materialized schema once no
 * consumer is holding a reference.
 *
 * Zod-specific caveat: `instanceof z.ZodObject` / `instanceof z.ZodType` on
 * the returned value will be `false` because the Proxy target is an empty
 * object. Zod's own internals and typical consumers use structural `_zod` /
 * `.def` checks rather than `instanceof`, so this is safe in practice.
 */
export { lazyGCableObject as lazySchema };
