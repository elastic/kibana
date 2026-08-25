/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { isPlainObject, get, has } from 'lodash';
import { set } from '@kbn/safer-lodash-set';

export function getFlattenedKeys(obj: object): string[] {
  const result: string[] = [];

  const keys: string[] = Object.keys(obj).map((k) => `["${k}"]`);
  let current: object | unknown[];

  while (keys.length) {
    const key = keys.pop()!;
    current = get(obj, key) as object | unknown[];
    if (isPlainObject(current)) {
      const innerKeys = Object.keys(current as object);
      if (innerKeys.length < 1) {
        result.push(`${key}`);
      } else {
        for (const innerKey of innerKeys) {
          keys.unshift(`${key}["${innerKey}"]`);
        }
      }
    } else if (Array.isArray(current)) {
      const arr = current as unknown[];
      if (arr.length < 1) {
        result.push(key);
      } else {
        for (let i = 0; i < arr.length; i++) keys.unshift(`${key}[${i}]`);
      }
    } else {
      result.push(key);
    }
  }
  return result;
}

/**
 * Given two objects, use the first object as a structural map to extract values
 * from a second object, preserving the placement in the first object.
 *
 * @example
 * ```ts
 * const keySource = { a: 1, b: [{ a: 1 }, { a: 2 }] };
 * const target = { a: 2, b: [{ a: 2, b: 3 }, { a: 3, b: 4 }] };
 * pickValuesBasedOnStructure(keySource, target);
 * // => { a: 2, b: [{ a: 2 }, { a: 3 }] }
 * ```
 *
 * @note This is intended to specifically be used in the application of forward
 *       compatibility schemas when loading a saved object from the database,
 *       downgrading it and keeping only the known, validated subset of values.
 */
export function pickValuesBasedOnStructure(structuralSource: object, target: object): object {
  const paths = getFlattenedKeys(structuralSource);
  const result: object = {};
  for (const path of paths) {
    if (!has(target, path)) continue;
    const value = get(target, path);
    if (Array.isArray(value)) {
      set(result, path, []);
    } else if (isPlainObject(value)) {
      set(result, path, {});
    } else {
      set(result, path, value);
    }
  }
  return result;
}
