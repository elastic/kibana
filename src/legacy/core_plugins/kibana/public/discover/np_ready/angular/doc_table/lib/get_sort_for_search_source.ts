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
import { IndexPattern } from '../../../../kibana_services';
import { SortOrder } from '../components/table_header/helpers';
import { getSort } from './get_sort';

/**
 * prepares sort for search source, that's sending the request to ES
 * handles the special case when there's sorting by date_nanos typed fields
 * the addon of the numeric_type guarantees the right sort order
 * when there are indices with date and indices with date_nanos field
 */
export function getSortForSearchSource(sort?: SortOrder[], indexPattern?: IndexPattern) {
  if (!sort || !indexPattern) {
    return [];
  }
  const { timeFieldName } = indexPattern;
  return getSort(sort, indexPattern).map((sortPair: Record<string, string>) => {
    if (indexPattern.isTimeNanosBased() && timeFieldName && sortPair[timeFieldName]) {
      return {
        [timeFieldName]: {
          order: sortPair[timeFieldName],
          numeric_type: 'date_nanos',
        },
      };
    }
    return sortPair;
  });
}
