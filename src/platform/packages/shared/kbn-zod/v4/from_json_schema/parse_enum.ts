/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from 'zod/v4';
import type { JsonSchema } from './types';

export function parseEnum(schema: JsonSchema): z.ZodType {
  const values = schema.enum || [];

  if (values.length === 0) {
    return z.never();
  }

  const allStrings = values.every((v): v is string => typeof v === 'string');

  if (allStrings && values.length > 0) {
    return z.enum(values as [string, ...string[]]);
  }

  const literals = values.map((value) => z.literal(value as string | number | boolean));

  if (literals.length === 1) {
    return literals[0];
  }

  return z.union(literals as unknown as [z.ZodType, z.ZodType, ...z.ZodType[]]);
}
