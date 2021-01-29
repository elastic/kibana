/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { isPlainObject } from 'lodash';
/**
 * Deeply merges two objects, omitting undefined values, and not deeply merging Arrays.
 *
 * @remarks
 * Should behave identically to lodash.merge, however it will not merge Array values like lodash does.
 * Any properties with `undefined` values on both objects will be ommitted from the returned object.
 */
export function merge<TBase extends Record<string, any>, TSource1 extends Record<string, any>>(
  baseObj: TBase,
  source1: TSource1
): TBase & TSource1;
export function merge<
  TBase extends Record<string, any>,
  TSource1 extends Record<string, any>,
  TSource2 extends Record<string, any>
>(baseObj: TBase, overrideObj: TSource1, overrideObj2: TSource2): TBase & TSource1 & TSource2;
export function merge<
  TBase extends Record<string, any>,
  TSource1 extends Record<string, any>,
  TSource2 extends Record<string, any>,
  TSource3 extends Record<string, any>
>(
  baseObj: TBase,
  overrideObj: TSource1,
  overrideObj2: TSource2
): TBase & TSource1 & TSource2 & TSource3;
export function merge<TReturn extends Record<string, any>>(
  baseObj: Record<string, any>,
  ...sources: Array<Record<string, any>>
): TReturn {
  const firstSource = sources[0];
  if (firstSource === undefined) {
    return baseObj as TReturn;
  }

  return sources
    .slice(1)
    .reduce(
      (merged, nextSource) => mergeObjects(merged, nextSource),
      mergeObjects(baseObj, firstSource)
    ) as TReturn;
}

const isMergable = (obj: any) => isPlainObject(obj);

const mergeObjects = <T extends Record<string, any>, U extends Record<string, any>>(
  baseObj: T,
  overrideObj: U
): T & U =>
  [...new Set([...Object.keys(baseObj), ...Object.keys(overrideObj)])].reduce((merged, key) => {
    const baseVal = baseObj[key];
    const overrideVal = overrideObj[key];

    if (isMergable(baseVal) && isMergable(overrideVal)) {
      merged[key] = mergeObjects(baseVal, overrideVal);
    } else if (overrideVal !== undefined) {
      merged[key] = overrideVal;
    } else if (baseVal !== undefined) {
      merged[key] = baseVal;
    }

    return merged;
  }, {} as any);
