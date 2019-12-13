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
import { esFilters, IIndexPattern } from '../../../../../plugins/data/public';
import { InputControlVisDependencies } from '../plugin';

export function createSearchSource(
  SearchSource: any,
  initialState: any,
  indexPattern: IIndexPattern,
  aggs: any,
  useTimeFilter: boolean,
  filters: esFilters.PhraseFilter[] = [],
  timefilter: InputControlVisDependencies['timefilter']
) {
  const searchSource = initialState ? new SearchSource(initialState) : new SearchSource();
  // Do not not inherit from rootSearchSource to avoid picking up time and globals
  searchSource.setParent(undefined);
  searchSource.setField('filter', () => {
    const activeFilters = [...filters];
    if (useTimeFilter) {
      const filter = timefilter.createFilter(indexPattern);
      if (filter) {
        activeFilters.push(filter);
      }
    }
    return activeFilters;
  });
  searchSource.setField('size', 0);
  searchSource.setField('index', indexPattern);
  searchSource.setField('aggs', aggs);
  return searchSource;
}
