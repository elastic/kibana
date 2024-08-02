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
import type { DiscoverAppState } from '../discover_app_state_container';
import type { DiscoverServices } from '../../../../build_services';
import type { DiscoverGlobalStateContainer } from '../discover_global_state_container';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';

/**
 * Updates the saved search with a given data view & Appstate
 * Is executed on every change of those, for making sure the saved search is
 * up to date before fetching data and persisting or sharing
 * @param savedSearch
 * @param dataView
 * @param state
 * @param globalStateContainer
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
  if (dataView && savedSearch.searchSource.getField('index')?.id !== dataView.id) {
    savedSearch.searchSource.setField('index', dataView);
    if (!dataView.isPersisted()) {
      savedSearch.usesAdHocDataView = true;
    }
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
      .setField('filter', [...globalFilters, ...appFilters]);
  }
  if (state) {
    savedSearch.columns = state.columns || [];
    savedSearch.sort = (state.sort as SortOrder[]) || [];
    if (state.grid) {
      savedSearch.grid = state.grid;
    }
    savedSearch.hideChart = state.hideChart;
    savedSearch.rowHeight = state.rowHeight;
    savedSearch.headerRowHeight = state.headerRowHeight;
    savedSearch.rowsPerPage = state.rowsPerPage;
    savedSearch.sampleSize = state.sampleSize;

    if (state.viewMode) {
      savedSearch.viewMode = state.viewMode;
    }

    if (typeof state.breakdownField !== 'undefined') {
      savedSearch.breakdownField = state.breakdownField;
    } else if (savedSearch.breakdownField) {
      savedSearch.breakdownField = '';
    }

    savedSearch.hideAggregatedPreview = state.hideAggregatedPreview;

    // add a flag here to identify ES|QL queries
    // these should be filtered out from the visualize editor
    const isEsqlMode = isDataSourceType(state.dataSource, DataSourceType.Esql);
    if (savedSearch.isTextBasedQuery || isEsqlMode) {
      savedSearch.isTextBasedQuery = isEsqlMode;
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
