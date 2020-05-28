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
import { i18n } from '@kbn/i18n';
import { IIndexPattern, IFieldType } from '../..';
import { getIndexPatternFromFilter } from './get_index_pattern_from_filter';
import { Filter } from '../filters';

function getValueFormatter(indexPattern?: IIndexPattern, key?: string) {
  if (!indexPattern || !key) return;

  let format = get(indexPattern, ['fields', 'byName', key, 'format']);
  if (!format && (indexPattern.fields as any).getByName) {
    // TODO: Why is indexPatterns sometimes a map and sometimes an array?
    const field: IFieldType = (indexPattern.fields as any).getByName(key);
    if (!field) {
      throw new Error(
        i18n.translate('data.filter.filterBar.fieldNotFound', {
          defaultMessage: 'Field {key} not found in index pattern {indexPattern}',
          values: { key, indexPattern: indexPattern.title },
        })
      );
    }
    format = field.format;
  }
  return format;
}

export function getDisplayValueFromFilter(filter: Filter, indexPatterns: IIndexPattern[]): string {
  if (typeof filter.meta.value === 'function') {
    const indexPattern = getIndexPatternFromFilter(filter, indexPatterns);
    const valueFormatter: any = getValueFormatter(indexPattern, filter.meta.key);
    return filter.meta.value(valueFormatter);
  } else {
    return filter.meta.value || '';
  }
}
