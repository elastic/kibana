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

export function parseNumber(schema: JsonSchema): z.ZodNumber {
  let zn = schema.type === 'integer' ? z.int() : z.number();

  if (schema.minimum !== undefined) {
    zn = zn.min(schema.minimum);
  }
  if (schema.exclusiveMinimum !== undefined) {
    zn = zn.gt(schema.exclusiveMinimum);
  }

  if (schema.maximum !== undefined) {
    zn = zn.max(schema.maximum);
  }
  if (schema.exclusiveMaximum !== undefined) {
    zn = zn.lt(schema.exclusiveMaximum);
  }

  if (schema.multipleOf !== undefined) {
    zn = zn.multipleOf(schema.multipleOf);
  }

  return zn;
}
