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

export default function(dot, flatObject) {
  const fullObject = {};
  _.each(flatObject, function(value, key) {
    const keys = key.split(dot);
    (function walk(memo, keys, value) {
      const _key = keys.shift();
      if (keys.length === 0) {
        memo[_key] = value;
      } else {
        if (!memo[_key]) memo[_key] = {};
        walk(memo[_key], keys, value);
      }
    })(fullObject, keys, value);
  });
  return fullObject;
}
