/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import _ from 'lodash';

/**
 * Takes an object and returns a flattened version, including nested arrays in a kibana way similar to the flattenHit function.
 *
 * @param {Record<string, unknown>} obj - object to flatten
 * @param {boolean} deep - whether to look into objects within arrays
 * @returns {Record<string, unknown | unknown[]>}
 */
export function kibanaFlatten(
  obj: Record<string, unknown>,
  deep: boolean = true
): Record<string, unknown | unknown[]> {
  const flat = {} as Record<string, unknown | unknown[]>;

  // recursively merge object
  (function flatten(_obj, keyPrefix = '') {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    _.forOwn(_obj, function (val, key) {
      key = keyPrefix + key;

      if (deep) {
        const isArrayOfObjects = Array.isArray(val) && _.isPlainObject(_.first(val));
        if (isArrayOfObjects) {
          _.each(val, (v) => flatten(v, key));
          return;
        }
      } else if (flat[key] !== void 0) {
        return;
      }

      const isValue = !_.isPlainObject(val);

      if (isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (Array.isArray(flat[key])) {
          (flat[key] as unknown[]).push(val);
        } else {
          flat[key] = [flat[key], val];
        }
        return;
      }

      flatten(val as Record<string, unknown>, key);
    });
  })(obj);

  return flat;
}
