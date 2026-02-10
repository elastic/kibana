/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedSearch, SortOrder } from '@kbn/saved-search-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/common';
import { cloneDeep } from 'lodash';
import type { DiscoverAppState } from '../redux';
import type { DiscoverServices } from '../../../../build_services';
import { DataSourceType, isDataSourceType } from '../../../../../common/data_sources';
import type { TabStateGlobalState } from '../redux';

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
  appState,
  globalState,
  services,
  useFilterAndQueryServices = false,
}: {
  savedSearch: SavedSearch;
  dataView: DataView | undefined;
  appState: DiscoverAppState | undefined;
  globalState: TabStateGlobalState | undefined;
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
  } else if (appState) {
    const appFilters = appState.filters ? cloneDeep(appState.filters) : [];
    const globalFilters = globalState?.filters ? cloneDeep(globalState.filters) : [];

    savedSearch.searchSource
      .setField('query', appState.query ?? undefined)
      .setField('filter', [...globalFilters, ...appFilters]);
  }

  if (appState) {
    savedSearch.columns = appState.columns || [];
    savedSearch.sort = (appState.sort as SortOrder[]) || [];
    if (appState.grid) {
      savedSearch.grid = appState.grid;
    }
    savedSearch.hideChart = appState.hideChart;
    savedSearch.rowHeight = appState.rowHeight;
    savedSearch.headerRowHeight = appState.headerRowHeight;
    savedSearch.rowsPerPage = appState.rowsPerPage;
    savedSearch.sampleSize = appState.sampleSize;
    savedSearch.density = appState.density;

    if (appState.viewMode) {
      savedSearch.viewMode = appState.viewMode;
    }

    if (typeof appState.breakdownField !== 'undefined') {
      savedSearch.breakdownField = appState.breakdownField;
    } else if (savedSearch.breakdownField) {
      savedSearch.breakdownField = '';
    }

    if (typeof appState.interval !== 'undefined') {
      savedSearch.chartInterval = appState.interval;
    } else if (savedSearch.chartInterval) {
      savedSearch.chartInterval = 'auto';
    }

    savedSearch.hideAggregatedPreview = appState.hideAggregatedPreview;

    // add a flag here to identify ES|QL queries
    // these should be filtered out from the visualize editor
    const isEsqlMode = isDataSourceType(appState.dataSource, DataSourceType.Esql);
    if (savedSearch.isTextBasedQuery || isEsqlMode) {
      savedSearch.isTextBasedQuery = isEsqlMode;
    }
  }

  const timeRange = globalState?.timeRange;
  const refreshInterval = globalState?.refreshInterval;
  savedSearch.timeRange =
    timeRange && (savedSearch.timeRestore || savedSearch.timeRange)
      ? {
          from: timeRange.from,
          to: timeRange.to,
        }
      : undefined;
  savedSearch.refreshInterval =
    refreshInterval && (savedSearch.timeRestore || savedSearch.refreshInterval)
      ? { value: refreshInterval.value, pause: refreshInterval.pause }
      : undefined;

  return savedSearch;
}
