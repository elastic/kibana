/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { set } from '@kbn/safer-lodash-set';
import { isPlainObject } from 'lodash';

/**
 * Behaviour is based on the ES `filter_path` query selector that can reduce
 * the amount of data sent over the wire by specifying paths to include.
 *
 * @note Special behaviour with arrays: the filter path "ignores" arrays and will
 *       attempt to apply keys to objects inside arrays as though they do not
 *       exist. For example: [{a: 1}, {a: 2, b: 3}], ["a"] => [{a: 1}, {a: 2}]
 *
 * @note See https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#common-options-response-filtering
 */
export function filterObject(obj: object, paths: readonly string[] | string[][]): object {
  let result = Array.isArray(obj) ? [] : {};

  for (const path of paths) {
    const keys = Array.isArray(path) ? path : path.split('.');
    let current = obj;

    for (let x = 0; x < keys.length; x++) {
      const key = keys[x];
      if (isPlainObject(current) && Object.hasOwn(current, key)) {
        current = (current as { [k: string]: object })[key];
        if (x === keys.length - 1) {
          set(result, keys.join('.'), current);
        }
      } else if (Array.isArray(current)) {
        const arrResult: unknown[] = [];
        const subKeys = keys.slice(x);
        for (const item of current) {
          const itemResult = filterObject(item, [subKeys]);
          if (
            (isPlainObject(itemResult) && Object.keys(itemResult).length) ||
            (Array.isArray(itemResult) && itemResult.length)
          ) {
            arrResult.push(itemResult);
          }
        }
        if (arrResult.length) {
          if (x === 0) {
            result = arrResult;
          } else {
            set(result, keys.slice(0, x).join('.'), arrResult);
          }
        }
        break;
      }
      break;
    }
  }

  return result;
}
