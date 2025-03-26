/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { pick } from 'lodash';

import { isPlainObject, get } from 'lodash';

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
 * Given two objects, use the first object as a structural map to extract keys
 * from a second object. The result should be an object that is structurally similar
 * to the first object, but with values from the second object.
 */
export function pickValuesBasedOnStructure(keySource: object, target: object): object {
  const keys = getFlattenedKeys(keySource);
  return pick(target, keys);
}
