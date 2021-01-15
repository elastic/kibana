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
import { getSortForSearchSource } from '../angular/doc_table';
import { SAMPLE_SIZE_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { IndexPattern, ISearchSource } from '../../../../data/common/';
import { SortOrder } from '../../saved_searches/types';
import { DiscoverServices } from '../../build_services';

/**
 * Helper function to update the given searchSource before fetching/sharing/persisting
 */
export function updateSearchSource(
  searchSource: ISearchSource,
  {
    indexPattern,
    services,
    sort,
    columns,
    useNewFieldsApi,
  }: {
    indexPattern: IndexPattern;
    services: DiscoverServices;
    sort: SortOrder[];
    columns: string[];
    useNewFieldsApi: boolean;
  }
) {
  const { uiSettings, data } = services;
  const usedSort = getSortForSearchSource(
    sort,
    indexPattern,
    uiSettings.get(SORT_DEFAULT_ORDER_SETTING)
  );

  searchSource
    .setField('index', indexPattern)
    .setField('size', uiSettings.get(SAMPLE_SIZE_SETTING))
    .setField('sort', usedSort)
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());
  if (useNewFieldsApi) {
    searchSource.removeField('fieldsFromSource');
    searchSource.setField('fields', ['*']);
  } else {
    searchSource.removeField('fields');
    const fieldNames = indexPattern.fields.map((field) => field.name);
    searchSource.setField('fieldsFromSource', fieldNames);
  }
  return searchSource;
}
