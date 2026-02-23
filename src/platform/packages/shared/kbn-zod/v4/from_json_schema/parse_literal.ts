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

export function parseLiteral(schema: JsonSchema): z.ZodType {
  const value = schema.const;

  if (value === null) {
    return z.null();
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return z.literal(value);
  }

  return z.unknown();
}
