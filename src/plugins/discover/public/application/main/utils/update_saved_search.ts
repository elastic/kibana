/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { cloneDeep } from 'lodash';
import { isTextBasedQuery } from './is_text_based_query';
import type { DiscoverAppState } from '../services/discover_app_state_container';
import type { DiscoverServices } from '../../../build_services';
import type { DiscoverGlobalStateContainer } from '../services/discover_global_state_container';

/**
 * Updates the saved search with a given data view & Appstate
 * Is executed on every change of those, for making sure the saved search is
 * up to date before fetching data and persisting or sharing
 * @param savedSearch
 * @param dataView
 * @param state
 * @param services
 * @param useFilterAndQueryServices - when true data services are being used for updating filter + query
 */
export function updateSavedSearch({
  savedSearch,
  dataView,
  state,
  globalStateContainer,
  services,
  useFilterAndQueryServices = false,
}: {
  savedSearch: SavedSearch;
  dataView?: DataView;
  state?: DiscoverAppState;
  globalStateContainer: DiscoverGlobalStateContainer;
  services: DiscoverServices;
  useFilterAndQueryServices?: boolean;
}) {
  debugger;
  if (dataView) {
    savedSearch.searchSource.setField('index', dataView);
    savedSearch.usesAdHocDataView = !dataView.isPersisted();
  }
  if (useFilterAndQueryServices) {
    savedSearch.searchSource
      .setField('query', services.data.query.queryString.getQuery())
      .setField('filter', services.data.query.filterManager.getFilters());
  } else if (state) {
    const appFilters = state.filters ? cloneDeep(state.filters) : [];
    const globalFilters = globalStateContainer.get()?.filters ?? [];

    savedSearch.searchSource
      .setField('query', state.query ?? undefined)
      .setField('filter', [...appFilters, ...globalFilters]);
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
    const isTextBasedQueryResult = isTextBasedQuery(state.query);
    if (savedSearch.isTextBasedQuery || isTextBasedQueryResult) {
      savedSearch.isTextBasedQuery = isTextBasedQueryResult;
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
