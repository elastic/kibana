/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod/v4';
import type { KbnZodType } from './kbn_zod_type';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny helps identify that it is a deliberate pass through of any value without validation.
 */
const _PassThroughAny = z.any().describe('Pass through any value without validation.');

// Add custom type marker for identification
Object.defineProperty(_PassThroughAny, 'kbnTypeName', {
  value: KbnZodTypes.PassThroughAny,
  writable: false,
  enumerable: true,
});

export const PassThroughAny = _PassThroughAny as typeof _PassThroughAny & KbnZodType;

export const isPassThroughAny = (val: unknown): val is typeof PassThroughAny => {
  return (val as KbnZodType)?.kbnTypeName === KbnZodTypes.PassThroughAny;
};
