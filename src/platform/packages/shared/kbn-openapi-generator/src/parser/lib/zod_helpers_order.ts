/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

/**
 * Canonical import order for `@kbn/zod-helpers/v4` symbols used in generated Zod code.
 * Shared between `getGenerationContext` (import inference) and
 * `assertZodHelperImportsCoverUsage` (test/CI coverage assertion) so both stay in sync.
 */
export const ZOD_HELPERS_ORDER = [
  'isValidDateMath',
  'isNonEmptyString',
  'ArrayFromString',
  'BooleanFromString',
] as const;
