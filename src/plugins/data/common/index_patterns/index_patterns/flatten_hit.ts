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

import _ from 'lodash';
import { IndexPattern } from './index_pattern';

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version

function flattenHit(indexPattern: IndexPattern, hit: Record<string, any>, deep: boolean) {
  const flat = {} as Record<string, any>;

  // recursively merge _source
  const fields = indexPattern.fields.getByName;
  (function flatten(obj, keyPrefix = '') {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    _.forOwn(obj, function (val, key) {
      key = keyPrefix + key;

      if (deep) {
        const field = fields(key);
        const isNestedField = field && field.type === 'nested';
        const isArrayOfObjects = Array.isArray(val) && _.isPlainObject(_.first(val));
        if (isArrayOfObjects && !isNestedField) {
          _.each(val, (v) => flatten(v, key));
          return;
        }
      } else if (flat[key] !== void 0) {
        return;
      }

      const field = fields(key);
      const hasValidMapping = field && field.type !== 'conflict';
      const isValue = !_.isPlainObject(val);

      if (hasValidMapping || isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (Array.isArray(flat[key])) {
          flat[key].push(val);
        } else {
          flat[key] = [flat[key], val];
        }
        return;
      }

      flatten(val, key);
    });
  })(hit._source);

  return flat;
}

function decorateFlattenedWrapper(hit: Record<string, any>, metaFields: Record<string, any>) {
  return function (flattened: Record<string, any>) {
    // assign the meta fields
    _.each(metaFields, function (meta) {
      if (meta === '_source') return;
      flattened[meta] = hit[meta];
    });

    // unwrap computed fields
    _.forOwn(hit.fields, function (val, key: any) {
      if (key[0] === '_' && !_.includes(metaFields, key)) return;
      // Flatten an array with 0 or 1 elements to a single value.
      if (Array.isArray(val) && val.length <= 1) {
        flattened[key] = val[0];
      } else {
        flattened[key] = val;
      }
    });

    return flattened;
  };
}

/**
 * This is wrapped by `createFlattenHitWrapper` in order to provide a single cache to be
 * shared across all uses of this function. It is only exported here for use in mocks.
 *
 * @internal
 */
export function flattenHitWrapper(
  indexPattern: IndexPattern,
  metaFields = {},
  cache = new WeakMap()
) {
  return function cachedFlatten(hit: Record<string, any>, deep = false) {
    const decorateFlattened = decorateFlattenedWrapper(hit, metaFields);
    const cached = cache.get(hit);
    const flattened = cached || flattenHit(indexPattern, hit, deep);
    if (!cached) {
      cache.set(hit, { ...flattened });
    }
    return decorateFlattened(flattened);
  };
}

/**
 * This wraps `flattenHitWrapper` so one single cache can be provided for all uses of that
 * function. The returned value of this function is what is included in the index patterns
 * setup contract.
 *
 * @public
 */
export function createFlattenHitWrapper() {
  const cache = new WeakMap();
  return _.partial(flattenHitWrapper, _, _, cache);
}
