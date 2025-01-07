/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import * as rt from 'io-ts';
import { toNumberRt } from '../to_number_rt';

export interface InRangeBrand {
  readonly InRange: unique symbol;
}

export type InRange = rt.Branded<number, InRangeBrand>;

export const inRangeRt = (start: number, end: number) =>
  new rt.Type<number, number>(
    'InRange',
    (input: unknown): input is number =>
      typeof input === 'number' && input >= start && input <= end,
    (input: unknown, context: rt.Context) =>
      typeof input === 'number' && input >= start && input <= end
        ? rt.success(input)
        : rt.failure(input, context),
    rt.identity
  );

export const inRangeFromStringRt = (start: number, end: number) => {
  return toNumberRt.pipe(inRangeRt(start, end));
};
