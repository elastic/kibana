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

const flattenedCache = new WeakMap();

// Takes a hit, merges it with any stored/scripted fields, and with the metaFields
// returns a flattened version

function flattenHit(indexPattern, hit, deep) {
  const flat = {};

  // recursively merge _source
  const fields = indexPattern.fields.byName;
  (function flatten(obj, keyPrefix) {
    keyPrefix = keyPrefix ? keyPrefix + '.' : '';
    _.forOwn(obj, function (val, key) {
      key = keyPrefix + key;

      if (deep) {
        const isNestedField = fields[key] && fields[key].type === 'nested';
        const isArrayOfObjects = Array.isArray(val) && _.isPlainObject(_.first(val));
        if (isArrayOfObjects && !isNestedField) {
          _.each(val, v => flatten(v, key));
          return;
        }
      } else if (flat[key] !== void 0) {
        return;
      }

      const hasValidMapping = fields[key] && fields[key].type !== 'conflict';
      const isValue = !_.isPlainObject(val);

      if (hasValidMapping || isValue) {
        if (!flat[key]) {
          flat[key] = val;
        } else if (Array.isArray(flat[key])) {
          flat[key].push(val);
        } else {
          flat[key] = [ flat[key], val ];
        }
        return;
      }

      flatten(val, key);
    });
  }(hit._source));

  return flat;
}

function decorateFlattenedWrapper(hit, metaFields) {
  return function (flattened) {
    // assign the meta fields
    _.each(metaFields, function (meta) {
      if (meta === '_source') return;
      flattened[meta] = hit[meta];
    });

    // unwrap computed fields
    _.forOwn(hit.fields, function (val, key) {
      if (key[0] === '_' && !_.contains(metaFields, key)) return;
      flattened[key] = Array.isArray(val) && val.length === 1 ? val[0] : val;
    });

    return flattened;
  };
}

export function flattenHitWrapper(indexPattern, metaFields = {}) {

  return function cachedFlatten(hit, deep = false) {
    const decorateFlattened = decorateFlattenedWrapper(hit, metaFields);
    const cached = flattenedCache.get(hit);
    const flattened = cached || flattenHit(indexPattern, hit, deep);
    if (!cached) {
      flattenedCache.set(hit, { ...flattened });
    }
    return decorateFlattened(flattened);
  };
}
