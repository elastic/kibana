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
import { cloneDeep } from 'lodash';
import { DiscoverAppState } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';

/**
 * Updates the given savedSearch by the dataView / appState
 * Given updateByFilterAndQuery is set to true, data service part responsible for filter and query
 * are used to update which is usually the case, but not when the savedSearch is loaded and updated
 * since then the services are not set to the right values
 * @param savedSearch
 * @param dataView
 * @param state
 * @param services
 * @param updateByFilterAndQuery
 */
export function updateSavedSearch({
  savedSearch,
  dataView,
  state,
  services,
  updateByFilterAndQuery = false,
}: {
  savedSearch: SavedSearch;
  dataView?: DataView;
  state?: DiscoverAppState;
  services: DiscoverServices;
  updateByFilterAndQuery?: boolean;
}) {
  if (dataView) {
    savedSearch.searchSource.setField('index', dataView);
    savedSearch.usesAdHocDataView = !dataView.isPersisted();
  }
  if (updateByFilterAndQuery || !state) {
    savedSearch.searchSource
      .setField('query', services.data.query.queryString.getQuery() || null)
      .setField('filter', services.data.query.filterManager.getFilters() || []);
  } else {
    savedSearch.searchSource
      .setField('query', state.query)
      .setField('filter', cloneDeep(state.filters) || []);
  }
  if (state) {
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
