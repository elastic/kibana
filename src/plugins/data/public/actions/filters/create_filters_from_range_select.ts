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

import { last } from 'lodash';
import moment from 'moment';
import { esFilters, IFieldType, RangeFilterParams } from '../../../public';
import { getIndexPatterns } from '../../../public/services';
import { deserializeAggConfig } from '../../search/expressions/utils';
import { RangeSelectContext } from '../../../../embeddable/public';

export async function createFiltersFromRangeSelectAction(event: RangeSelectContext['data']) {
  const column: Record<string, any> = event.table.columns[event.column];

  if (!column || !column.meta) {
    return [];
  }

  const indexPattern = await getIndexPatterns().get(column.meta.indexPatternId);
  const aggConfig = deserializeAggConfig({
    ...column.meta,
    indexPattern,
  });
  const field: IFieldType = aggConfig.params.field;

  if (!field || event.range.length <= 1) {
    return [];
  }

  const min = event.range[0];
  const max = last(event.range);

  if (min === max) {
    return [];
  }

  const isDate = field.type === 'date';

  const range: RangeFilterParams = {
    gte: isDate ? moment(min).toISOString() : min,
    lt: isDate ? moment(max).toISOString() : max,
  };

  if (isDate) {
    range.format = 'strict_date_optional_time';
  }

  return esFilters.mapAndFlattenFilters([esFilters.buildRangeFilter(field, range, indexPattern)]);
}
