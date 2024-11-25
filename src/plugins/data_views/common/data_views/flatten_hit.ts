/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// --------- DEPRECATED ---------
// This implementation of flattenHit is deprecated and should no longer be used.
// If you consider adding features to this, please don't but use the `flattenHit`
// implementation from the data plugin.

import _ from 'lodash';
import { DataView } from './data_view';

/**
 * Takes a hit, merges it with whatever stored/scripted fields, and with the metaFields
 * returns a flattened version
 *
 * @param {DataView} indexPattern
 * @param {Record<string, unknown>} hit - userland data
 * @param {boolean} deep - whether to look into objects within arrays
 * @returns {Record<string, unknown[]>}
 */
function flattenHit(
  indexPattern: DataView,
  hit: Record<string, unknown>,
  deep: boolean
): Record<string, unknown[]> {
  const flat = {} as Record<string, unknown[]>;

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

function decorateFlattenedWrapper(
  hit: Record<string, unknown[]>,
  metaFields: Record<string, string>
) {
  return function (flattened: Record<string, unknown>) {
    // assign the meta fields
    _.each(metaFields, function (meta) {
      if (meta === '_source') return;
      flattened[meta] = hit[meta];
    });

    // unwrap computed fields
    _.forOwn(hit.fields, function (val, key: string) {
      // Flatten an array with 0 or 1 elements to a single value.
      if (Array.isArray(val) && val.length <= 1) {
        flattened[key] = val[0];
      } else {
        flattened[key] = val;
      }
    });

    // Force all usage of Object.keys to use a predefined sort order,
    // instead of using insertion order
    return new Proxy(flattened, {
      ownKeys: (target) => {
        return Reflect.ownKeys(target).sort((a, b) => {
          const aIsMeta = _.includes(metaFields, a);
          const bIsMeta = _.includes(metaFields, b);
          if (aIsMeta && bIsMeta) {
            return String(a).localeCompare(String(b));
          }
          if (aIsMeta) {
            return 1;
          }
          if (bIsMeta) {
            return -1;
          }
          return String(a).localeCompare(String(b));
        });
      },
    });
  };
}

/**
 * This is wrapped by `createFlattenHitWrapper` in order to provide a single cache to be
 * shared across all uses of this function. It is only exported here for use in mocks.
 *
 * @internal
 */
export function flattenHitWrapper<T>(dataView: DataView, metaFields = {}, cache = new WeakMap()) {
  return function cachedFlatten(hit: Record<string, unknown[]>, deep = false) {
    const decorateFlattened = decorateFlattenedWrapper(hit, metaFields);
    const cached = cache.get(hit);
    const flattened = cached || flattenHit(dataView, hit, deep);
    if (!cached) {
      cache.set(hit, { ...flattened });
    }
    return decorateFlattened(flattened);
  };
}
