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

export function createIndexPatternCache() {

  const vals = {};
  const cache = {};

  const validId = function (id) {
    return typeof id !== 'object';
  };

  cache.get = function (id) {
    if (validId(id)) return vals[id];
  };

  cache.set = function (id, prom) {
    if (validId(id)) vals[id] = prom;
    return prom;
  };

  cache.clear = cache.delete = function (id) {
    if (validId(id)) delete vals[id];
  };

  cache.clearAll = function () {
    for (const id in vals) {
      if (vals.hasOwnProperty(id)) {
        delete vals[id];
      }
    }
  };

  return cache;
}
