/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z3 from 'zod/v3';
import type * as z4 from 'zod/v4';

export function isZod(value: unknown): value is z3.ZodTypeAny | z4.ZodType {
  // Check for v3
  if (value instanceof z3.ZodType) {
    return true;
  }
  // Check for v4 (has _zod symbol)
  if (value && typeof value === 'object' && '_zod' in value) {
    return true;
  }
  return false;
}
