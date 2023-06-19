/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep, isEqual } from 'lodash';
import { IUiSettingsClient } from '@kbn/core/public';
import { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getChartHidden } from '@kbn/unified-histogram-plugin/public';
import { DiscoverAppState } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { getDefaultSort, getSortArray } from '../../../utils/sorting';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../common';
import { isTextBasedQuery } from './is_text_based_query';
import { getValidViewMode } from './get_valid_view_mode';

function getDefaultColumns(savedSearch: SavedSearch, uiSettings: IUiSettingsClient) {
  if (savedSearch.columns && savedSearch.columns.length > 0) {
    return [...savedSearch.columns];
  }
  if (
    uiSettings.get(SEARCH_FIELDS_FROM_SOURCE) &&
    isEqual(uiSettings.get(DEFAULT_COLUMNS_SETTING), [])
  ) {
    return ['_source'];
  }
  return [...uiSettings.get(DEFAULT_COLUMNS_SETTING)];
}

export function getStateDefaults({
  savedSearch,
  services,
}: {
  savedSearch: SavedSearch;
  services: DiscoverServices;
}) {
  const { searchSource } = savedSearch;
  const { data, uiSettings, storage } = services;
  const dataView = searchSource.getField('index');
  const chartHidden = getChartHidden(storage, 'discover');

  const defaultState: DiscoverAppState = {
    query: data.query.queryString.getDefaultQuery(),
    sort: getDefaultSort(
      dataView,
      uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc'),
      uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)
    ),
    columns: [],
    index: dataView?.id,
    interval: 'auto',
    filters: cloneDeep(searchSource.getOwnField('filter')) as DiscoverAppState['filters'],
    hideChart: typeof chartHidden === 'boolean' ? chartHidden : undefined,
    viewMode: undefined,
    hideAggregatedPreview: undefined,
    savedQuery: undefined,
    rowHeight: undefined,
    rowsPerPage: undefined,
    grid: undefined,
    breakdownField: undefined,
  };
  return updateAppStateBySavedSearch({ savedSearch, appState: defaultState, uiSettings });
}

export function updateAppStateBySavedSearch({
  savedSearch,
  appState,
  uiSettings,
  updateDataView = true,
}: {
  savedSearch: SavedSearch;
  appState: DiscoverAppState;
  uiSettings: IUiSettingsClient;
  updateDataView?: boolean;
}) {
  const searchSource = savedSearch.searchSource;
  const dataView = searchSource.getField('index');
  const nextAppState = { ...appState };
  if (updateDataView && dataView) {
    nextAppState.index = dataView.id;
  }

  const columns = getDefaultColumns(savedSearch, uiSettings);
  if (columns.length && !isEqual(columns, appState.columns)) {
    nextAppState.columns = columns;
  }
  const query = searchSource.getField('query');
  if (query && !isEqual(query, appState.query)) {
    nextAppState.query = query;
  }
  const sort = getSortArray(savedSearch.sort ?? [], dataView!);
  if (sort.length && !isEqual(sort, appState.sort)) {
    nextAppState.sort = sort;
  }

  if (savedSearch.grid && !isEqual(savedSearch.grid, appState.grid)) {
    nextAppState.grid = savedSearch.grid;
  }
  if (savedSearch.hideChart !== undefined) {
    nextAppState.hideChart = savedSearch.hideChart;
  }
  if (savedSearch.rowHeight !== undefined) {
    nextAppState.rowHeight = savedSearch.rowHeight;
  }
  if (savedSearch.viewMode) {
    nextAppState.viewMode = getValidViewMode({
      viewMode: savedSearch.viewMode,
      isTextBasedQueryMode: isTextBasedQuery(query),
    });
  }
  if (savedSearch.hideAggregatedPreview) {
    nextAppState.hideAggregatedPreview = savedSearch.hideAggregatedPreview;
  }
  if (savedSearch.rowsPerPage) {
    nextAppState.rowsPerPage = savedSearch.rowsPerPage;
  }

  if (savedSearch.breakdownField) {
    nextAppState.breakdownField = savedSearch.breakdownField;
  }
  return nextAppState;
}
