/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { z } from '@kbn/zod';
import type { KbnZodType } from './kbn_zod_type';
import { KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny heps identify that it is a deliberate pass through of any value without validation.
 */

// Use z.any() with added KbnZodType marker
const passThroughAnySchema = z.any().describe('Pass through any value without validation.');

type PassThroughAnyType = typeof passThroughAnySchema & KbnZodType;

export const PassThroughAny = Object.assign(passThroughAnySchema, {
  kbnTypeName: KbnZodTypes.PassThroughAny,
}) as PassThroughAnyType;

export const isPassThroughAny = (val: unknown): val is PassThroughAnyType => {
  return (val as Partial<KbnZodType>)?.kbnTypeName === KbnZodTypes.PassThroughAny;
};
