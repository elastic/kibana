/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export * from 'zod/v4';
/** Core issue shapes for libraries wrapping Zod `superRefine` / refinements (not re-exported from `zod/v4` classic). */
export type { $ZodRawIssue } from 'zod/v4/core';
export { isZod } from './util';
export { lazySchema, setLazySchemaDisabled } from './lazy_schema';
