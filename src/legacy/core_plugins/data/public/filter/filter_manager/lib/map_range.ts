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

import { Filter, RangeFilter } from '@kbn/es-query';
import { get } from 'lodash';
import { SavedObjectNotFound } from '../../../../../../../plugins/kibana_utils/public';
import { IndexPatterns, IndexPattern } from '../../../index_patterns';

const TYPE = 'range';

const getFirstRangeKey = (filter: RangeFilter) => filter.range && Object.keys(filter.range)[0];
const getRangeByKey = (filter: RangeFilter, key: string) => get(filter, ['range', key]);
const isScriptedRange = (filter: Filter) => {
  const params = get(filter, ['script', 'script', 'params'], {});

  return Boolean(
    Object.keys(params).find((key: string) => ['gte', 'gt', 'lte', 'lt'].includes(key))
  );
};

function getParams(filter: RangeFilter, indexPattern?: IndexPattern) {
  const isScriptedRangeFilter = isScriptedRange(filter);
  const key: string = (isScriptedRangeFilter ? filter.meta.field : getFirstRangeKey(filter)) || '';
  const params: any = isScriptedRangeFilter
    ? get(filter, 'script.script.params')
    : getRangeByKey(filter, key);
  const left = params.gte || params.gt || -Infinity;
  const right = params.lte || params.lt || Infinity;

  let value = `${left} to ${right}`;

  // Sometimes a filter will end up with an invalid index param. This could happen for a lot of reasons,
  // for example a user might manually edit the url or the index pattern's ID might change due to
  // external factors e.g. a reindex. We only need the index in order to grab the field formatter, so we fallback
  // on displaying the raw value if the index is invalid.
  if (key && indexPattern && indexPattern.fields.byName[key]) {
    const convert = indexPattern.fields.byName[key].format.getConverterFor('text');

    value = `${convert(left)} to ${convert(right)}`;
  }

  return { type: TYPE, key, value, params };
}

export const isMapRangeFilter = (filter: any): filter is RangeFilter =>
  filter && (filter.range || isScriptedRange(filter));

export const mapRange = (indexPatterns: IndexPatterns) => {
  return async (filter: Filter) => {
    if (!isMapRangeFilter(filter)) {
      throw filter;
    }

    try {
      const indexPattern = await indexPatterns.get(filter.meta.index || '');

      return getParams(filter, indexPattern);
    } catch (error) {
      if (error instanceof SavedObjectNotFound) {
        return getParams(filter);
      }
      throw error;
    }
  };
};
