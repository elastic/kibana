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

import { get } from 'lodash';
import { esFilters } from '../../../../../../../../plugins/data/public';
import { IndexPattern } from '../../../../index_patterns/index_patterns';
import { Field } from '../../../../index_patterns/fields';
import { getIndexPatternFromFilter } from './filter_editor_utils';

function getValueFormatter(indexPattern?: IndexPattern, key?: string) {
  if (!indexPattern || !key) return;
  let format = get(indexPattern, ['fields', 'byName', key, 'format']);
  if (!format && indexPattern.fields.getByName) {
    // TODO: Why is indexPatterns sometimes a map and sometimes an array?
    format = (indexPattern.fields.getByName(key) as Field).format;
  }
  return format;
}

export function getDisplayValueFromFilter(
  filter: esFilters.Filter,
  indexPatterns: IndexPattern[]
): string {
  const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);

  if (typeof filter.meta.value === 'function') {
    const valueFormatter: any = getValueFormatter(indexPattern, filter.meta.key);
    return filter.meta.value(valueFormatter);
  } else {
    return filter.meta.value || '';
  }
}
