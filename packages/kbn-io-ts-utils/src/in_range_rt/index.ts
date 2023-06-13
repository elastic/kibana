/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import * as rt from 'io-ts';
import { toNumberRt } from '../to_number_rt';

export interface InRangeBrand {
  readonly InRange: unique symbol;
}

export type InRange = rt.Branded<number, InRangeBrand>;

export const inRangeRt = (start: number, end: number) =>
  rt.brand(
    rt.number, // codec
    (n): n is InRange => n >= start && n <= end,
    // refinement of the number type
    'InRange' // name of this codec
  );

export const inRangeFromStringRt = (start: number, end: number) => {
  return toNumberRt.pipe(inRangeRt(start, end));
};
