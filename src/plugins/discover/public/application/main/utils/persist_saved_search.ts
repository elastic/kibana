/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { isOfAggregateQueryType } from '@kbn/es-query';
import { DataView } from '@kbn/data-views-plugin/public';
import { SavedObjectSaveOpts } from '@kbn/saved-objects-plugin/public';
import { SavedSearch, SortOrder, saveSavedSearch } from '@kbn/saved-search-plugin/public';
import { AppState } from '../services/discover_app_state_container';
import { updateSearchSource } from './update_search_source';
import { DiscoverServices } from '../../../build_services';
/**
 * Helper function to update and persist the given savedSearch
 */
export async function persistSavedSearch(
  savedSearch: SavedSearch,
  {
    dataView,
    onError,
    onSuccess,
    services,
    saveOptions,
    state,
  }: {
    dataView: DataView;
    onError: (error: Error, savedSearch: SavedSearch) => void;
    onSuccess: (id: string) => void;
    saveOptions: SavedObjectSaveOpts;
    services: DiscoverServices;
    state: AppState;
  }
) {
  updateSearchSource(savedSearch.searchSource, true, {
    dataView,
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

  if (typeof state.breakdownField !== 'undefined') {
    savedSearch.breakdownField = state.breakdownField;
  } else if (savedSearch.breakdownField) {
    savedSearch.breakdownField = '';
  }

  if (state.hideAggregatedPreview) {
    savedSearch.hideAggregatedPreview = state.hideAggregatedPreview;
  }

  // add a flag here to identify text based language queries
  // these should be filtered out from the visualize editor
  const isTextBasedQuery = state.query && isOfAggregateQueryType(state.query);
  if (savedSearch.isTextBasedQuery || isTextBasedQuery) {
    savedSearch.isTextBasedQuery = isTextBasedQuery;
  }

  savedSearch.usesAdHocDataView = !dataView.isPersisted();

  const { from, to } = services.timefilter.getTime();
  const refreshInterval = services.timefilter.getRefreshInterval();
  savedSearch.timeRange =
    savedSearch.timeRestore || savedSearch.timeRange
      ? {
          from,
          to,
        }
      : undefined;
  savedSearch.refreshInterval =
    savedSearch.timeRestore || savedSearch.refreshInterval
      ? { value: refreshInterval.value, pause: refreshInterval.pause }
      : undefined;

  try {
    const id = await saveSavedSearch(
      savedSearch,
      saveOptions,
      services.core.savedObjects.client,
      services.savedObjectsTagging
    );
    if (id) {
      onSuccess(id);
    }
    return { id };
  } catch (saveError) {
    onError(saveError, savedSearch);
    return { error: saveError };
  }
}
