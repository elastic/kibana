/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewSpec } from '@kbn/data-views-plugin/common';
import { getSavedSearch } from '@kbn/saved-search-plugin/public';
import { DiscoverServices } from '../../../build_services';
import { DiscoverStateContainer } from '../services/discover_state';
import { loadDataViewBySavedSearch } from '../load_data_view_by_saved_search';
import { restoreStateFromSavedSearch } from '../../../services/saved_searches/restore_from_saved_search';

export const loadSavedSearch = async (
  id: string,
  {
    services,
    stateContainer,
    setError,
    dataViewSpec,
  }: {
    services: DiscoverServices;
    stateContainer: DiscoverStateContainer;
    setError: (e: Error) => void;
    dataViewSpec?: DataViewSpec;
  }
) => {
  const currentSavedSearch = await getSavedSearch(id, {
    search: services.data.search,
    savedObjectsClient: services.core.savedObjects.client,
    spaces: services.spaces,
    savedObjectsTagging: services.savedObjectsTagging,
  });

  const currentDataView = await loadDataViewBySavedSearch(
    currentSavedSearch,
    stateContainer,
    services,
    setError,
    dataViewSpec
  );

  if (!currentDataView) {
    return;
  }
  if (!currentSavedSearch.searchSource.getField('index')) {
    currentSavedSearch.searchSource.setField('index', currentDataView);
  }
  stateContainer.internalStateContainer.transitions.setDataView(currentDataView);

  restoreStateFromSavedSearch({
    savedSearch: currentSavedSearch,
    timefilter: services.timefilter,
  });
  return currentSavedSearch;
};
