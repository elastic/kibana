/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  array as rawArray,
  discriminatedUnion as rawDiscriminatedUnion,
  intersection as rawIntersection,
  looseObject as rawLooseObject,
  object as rawObject,
  record as rawRecord,
  strictObject as rawStrictObject,
  tuple as rawTuple,
  union as rawUnion,
} from 'zod/v4';
import { lazySchema } from './lazy_schema';

export * from 'zod/v4';

const wrapBuilder = <F extends (...args: any[]) => object>(fn: F): F =>
  ((...args: Parameters<F>) => lazySchema(() => fn(...args))) as F;

export const array = wrapBuilder(rawArray);
export const tuple = wrapBuilder(rawTuple);
export const record = wrapBuilder(rawRecord);
export const object = wrapBuilder(rawObject);
export const strictObject = wrapBuilder(rawStrictObject);
export const looseObject = wrapBuilder(rawLooseObject);
export const union = wrapBuilder(rawUnion);
export const discriminatedUnion = wrapBuilder(rawDiscriminatedUnion);
export const intersection = wrapBuilder(rawIntersection);
