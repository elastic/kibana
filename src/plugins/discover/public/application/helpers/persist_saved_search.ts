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
import { updateSearchSource } from './update_search_source';
import { SearchSource } from '../../../../data/common/search/search_source';
import { DataPublicPluginStart, IndexPattern } from '../../../../data/public';
import { SavedSearch } from '../../saved_searches';
import { AppState } from '../angular/discover_state';
import { SortOrder } from '../../saved_searches/types';
import { SavedObjectSaveOpts } from '../../../../saved_objects/public';

export async function persistSavedSearch({
  config,
  data,
  indexPattern,
  onError,
  onSuccess,
  savedSearch,
  saveOptions,
  searchSource,
  state,
}: {
  config: IUiSettingsClient;
  data: DataPublicPluginStart;
  indexPattern: IndexPattern;
  onError: (error: Error, savedSearch: SavedSearch) => void;
  onSuccess: (id: string) => void;
  savedSearch: SavedSearch;
  saveOptions: SavedObjectSaveOpts;
  searchSource: SearchSource;
  state: AppState;
}) {
  updateSearchSource(searchSource, {
    indexPattern,
    config,
    state,
    data,
  });

  savedSearch.columns = state.columns || [];
  savedSearch.sort = (state.sort as SortOrder[]) || [];

  try {
    const id = await savedSearch.save(saveOptions);
    onSuccess(id);
    return { id };
  } catch (saveError) {
    onError(saveError, savedSearch);
    return { error: saveError };
  }
}
