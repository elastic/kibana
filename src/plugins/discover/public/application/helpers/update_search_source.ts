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
import { IUiSettingsClient } from 'kibana/public';
import { getSortForSearchSource } from '../angular/doc_table';
import { SAMPLE_SIZE_SETTING, SORT_DEFAULT_ORDER_SETTING } from '../../../common';
import { IndexPattern, SearchSource } from '../../../../data/common/';
import { AppState } from '../angular/discover_state';
import { SortOrder } from '../../saved_searches/types';
import { DataPublicPluginStart } from '../../../../data/public';

export function updateSearchSource(
  searchSource: SearchSource,
  {
    state,
    indexPattern,
    data,
    config,
  }: {
    config: IUiSettingsClient;
    data: DataPublicPluginStart;
    indexPattern: IndexPattern;
    state: AppState;
  }
) {
  searchSource
    .setField('index', indexPattern)
    .setField('size', config.get(SAMPLE_SIZE_SETTING))
    .setField(
      'sort',
      getSortForSearchSource(
        state.sort as SortOrder[],
        indexPattern,
        config.get(SORT_DEFAULT_ORDER_SETTING)
      )
    )
    .setField('query', data.query.queryString.getQuery() || null)
    .setField('filter', data.query.filterManager.getFilters());
}
