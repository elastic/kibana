/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { z } from '@kbn/zod/v4';

/**
 * Transforms discriminated union value for single-option unions by flattening the structure.
 * For discriminated unions with only one option and one field (besides the type discriminator),
 * the nested object structure is an implementation detail and should be flattened to just the field value.
 *
 * Example:
 * Input:  { type: 'headers', headers: 'my-key' }
 * Output: 'my-key'
 */
export const transformDiscriminatedUnionValue = (
  value: Record<string, unknown>,
  schema: z.ZodDiscriminatedUnion<z.ZodObject<z.ZodRawShape>[]>
): unknown => {
  const isSingleOption = schema.options.length === 1;

  if (!isSingleOption || !value || typeof value !== 'object') {
    return value;
  }

  const { type, ...rest } = value;
  const remainingKeys = Object.keys(rest);

  if (remainingKeys.length === 1) {
    return rest[remainingKeys[0]];
  }

  return rest;
};
