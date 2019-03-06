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

import { has, get } from 'lodash';
import { SavedObjectNotFound } from '../../errors';

export function FilterBarLibMapRangeProvider(Promise, indexPatterns) {
  return function (filter) {
    const isScriptedRangeFilter = isScriptedRange(filter);
    if (!filter.range && !isScriptedRangeFilter) {
      return Promise.reject(filter);
    }

    function getParams(indexPattern) {
      const type = 'range';
      const key = isScriptedRangeFilter ? filter.meta.field : Object.keys(filter.range)[0];
      const params = isScriptedRangeFilter ? filter.script.script.params : filter.range[key];

      let left = has(params, 'gte') ? params.gte : params.gt;
      if (left == null) left = -Infinity;

      let right = has(params, 'lte') ? params.lte : params.lt;
      if (right == null) right = Infinity;

      // Sometimes a filter will end up with an invalid index param. This could happen for a lot of reasons,
      // for example a user might manually edit the url or the index pattern's ID might change due to
      // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
      // on displaying the raw value if the index is invalid.
      let value = `${left} to ${right}`;
      if (indexPattern) {
        const convert = indexPattern.fields.byName[key].format.getConverterFor('text');
        value = `${convert(left)} to ${convert(right)}`;
      }

      return { type, key, value, params };
    }

    return indexPatterns
      .get(filter.meta.index)
      .then(getParams)
      .catch((error) => {
        if (error instanceof SavedObjectNotFound) {
          return getParams();
        }
        throw error;
      });

  };
}

function isScriptedRange(filter) {
  const params = get(filter, ['script', 'script', 'params']);
  return params && Object.keys(params).find(key => ['gte', 'gt', 'lte', 'lt'].includes(key));
}
