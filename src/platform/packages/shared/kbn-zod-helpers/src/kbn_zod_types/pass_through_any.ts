/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as z from '@kbn/zod';
import { KbnZodType, KbnZodTypes } from './kbn_zod_type';

/**
 * This is a helper schema to pass through any value without validation.
 * KbnZodTypes.PassThroughAny heps identify that it is a deliberate pass through of any value without validation.
 */
class KbnPassThroughAny extends z.ZodAny implements KbnZodType {
  readonly kbnTypeName = KbnZodTypes.PassThroughAny;

  static create() {
    return new KbnPassThroughAny({ typeName: z.ZodFirstPartyTypeKind.ZodAny }).describe(
      'Pass through any value without validation.'
    );
  }
}

export const PassThroughAny = KbnPassThroughAny.create();

export const isPassThroughAny = (val: unknown): val is KbnPassThroughAny => {
  return (val as KbnPassThroughAny).kbnTypeName === KbnZodTypes.PassThroughAny;
};
