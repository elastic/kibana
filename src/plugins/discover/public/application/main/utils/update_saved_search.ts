/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AppState } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { updatePersistedSearchSource } from './update_search_source';

export function updateSavedSearch(
  {
    savedSearch,
    dataView,
    state,
    services,
  }: {
    savedSearch: SavedSearch;
    dataView: DataView;
    state: AppState;
    services: DiscoverServices;
  },
  initial: boolean = false
) {
  if (!initial) {
    updatePersistedSearchSource(savedSearch.searchSource, {
      dataView,
      services,
    });
  } else {
    savedSearch.searchSource
      .setField('index', dataView)
      .setField('query', state.query)
      .setField('filter', state.filters);
  }
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

  // add a flag here to identify text based language queries
  // these should be filtered out from the visualize editor
  const isTextBasedQuery = state.query && isOfAggregateQueryType(state.query);
  if (savedSearch.isTextBasedQuery || isTextBasedQuery) {
    savedSearch.isTextBasedQuery = isTextBasedQuery;
  }

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
  return savedSearch;
}
