/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type * as z4 from 'zod/v4';
import { LAZY_ZOD_SCHEMA } from './lazy_immutable_gcable_object';

export function isZod(value: unknown): value is z4.ZodType {
  if (!value || typeof value !== 'object') {
    return false;
  }
  if ((value as Record<PropertyKey, unknown>)[LAZY_ZOD_SCHEMA] === true) {
    return true;
  }
  // Check for v4 (has _zod symbol)
  return '_zod' in value;
}
