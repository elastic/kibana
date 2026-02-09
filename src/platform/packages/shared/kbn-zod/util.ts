/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as zod from 'zod';

export function isZod(value: unknown): value is zod.ZodType {
  // Check for v4 (has _zod symbol)
  if (value && typeof value === 'object' && '_zod' in value) {
    return true;
  }
  return false;
}
