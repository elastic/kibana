/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import type { KbnZodType } from './kbn_zod_type';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny helps identify that it is a deliberate pass through of any value without validation.
 */
type KbnPassThroughAny = z.ZodAny & KbnZodType;

function createPassThroughAny(): KbnPassThroughAny {
  const schema = z.any().describe('Pass through any value without validation.');
  return Object.assign(schema, {
    kbnTypeName: KbnZodTypes.PassThroughAny as const,
  });
}

export const PassThroughAny = createPassThroughAny();

export const isPassThroughAny = (val: unknown): val is KbnPassThroughAny => {
  return (val as KbnPassThroughAny).kbnTypeName === KbnZodTypes.PassThroughAny;
};
