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

export function parseString(schema: JsonSchema): z.ZodType {
  // Handle URL format specially - z.url() returns ZodUrl, not ZodString
  // Note: z.url() doesn't support min/max/pattern, so we return early
  if (schema.format === 'uri') {
    return z.url();
  }

  let zs = z.string();

  if (schema.minLength !== undefined) {
    zs = zs.min(schema.minLength);
  }
  if (schema.maxLength !== undefined) {
    zs = zs.max(schema.maxLength);
  }

  if (schema.pattern) {
    zs = zs.regex(new RegExp(schema.pattern));
  }

  if (schema.format) {
    switch (schema.format) {
      case 'email':
        zs = zs.email();
        break;
      case 'uuid':
        zs = zs.uuid();
        break;
      case 'date-time':
        zs = zs.datetime();
        break;
      case 'date':
        zs = zs.date();
        break;
      case 'time':
        zs = zs.time();
        break;
      // Other formats are ignored (no built-in Zod validation)
    }
  }

  return zs;
}
