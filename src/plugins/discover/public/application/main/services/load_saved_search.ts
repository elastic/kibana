/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView } from '@kbn/data-views-plugin/common';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverAppState } from './discover_app_state_container';
import { DiscoverSavedSearchContainer } from './discover_saved_search_container';
import { addLog } from '../../../utils/add_log';

export const loadSavedSearch = async ({
  id,
  dataView,
  appState,
  savedSearchContainer,
}: {
  id: string | undefined;
  dataView: DataView | undefined;
  appState: DiscoverAppState | undefined;
  savedSearchContainer: DiscoverSavedSearchContainer;
}): Promise<SavedSearch> => {
  addLog('[discoverState] loadSavedSearch');
  let nextSavedSearch = id
    ? await savedSearchContainer.load(id)
    : await savedSearchContainer.new(dataView);

  if (appState) {
    if (
      id &&
      dataView &&
      appState.index &&
      appState.index !== nextSavedSearch.searchSource.getField('index')?.id
    ) {
      // given a saved search is loaded, but the state in URL has a different data view selected
      nextSavedSearch.searchSource.setField('index', dataView);
    }

    nextSavedSearch = savedSearchContainer.update({
      nextDataView: nextSavedSearch.searchSource.getField('index'),
      nextState: appState,
    });
  }

  return nextSavedSearch;
};
