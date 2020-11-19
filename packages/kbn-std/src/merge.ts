/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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
