/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/public';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { updateSearchSource } from './update_search_source';
import { SavedSearch } from '../../../services/saved_searches';
import { AppState } from '../services/discover_state';
import type { SortOrder } from '../../../services/saved_searches';
import { DiscoverServices } from '../../../build_services';
import { saveSavedSearch } from '../../../services/saved_searches';

/**
 * Helper function to update and persist the given savedSearch
 */
export async function persistSavedSearch(
  savedSearch: SavedSearch,
  {
    indexPattern,
    onError,
    onSuccess,
    services,
    saveOptions,
    state,
  }: {
    indexPattern: DataView;
    onError: (error: Error, savedSearch: SavedSearch) => void;
    onSuccess: (id: string) => void;
    saveOptions: SavedObjectSaveOpts;
    services: DiscoverServices;
    state: AppState;
  }
) {
  updateSearchSource(savedSearch.searchSource, true, {
    indexPattern,
    services,
    sort: state.sort as SortOrder[],
    useNewFieldsApi: false,
  });

  savedSearch.columns = state.columns || [];
  savedSearch.sort = (state.sort as SortOrder[]) || [];
  if (state.grid) {
    savedSearch.grid = state.grid;
  }
  if (typeof state.hideChart !== 'undefined') {
    savedSearch.hideChart = state.hideChart;
  }
  if (typeof state.rowHeight !== 'undefined') {
    savedSearch.rowHeight = state.rowHeight;
  }

  if (state.viewMode) {
    savedSearch.viewMode = state.viewMode;
  }

  if (state.hideAggregatedPreview) {
    savedSearch.hideAggregatedPreview = state.hideAggregatedPreview;
  }

  try {
    const id = await saveSavedSearch(savedSearch, saveOptions, services.core.savedObjects.client);
    if (id) {
      onSuccess(id);
    }
    return { id };
  } catch (saveError) {
    onError(saveError, savedSearch);
    return { error: saveError };
  }
}
