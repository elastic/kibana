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
import { DiscoverServices } from '../../../build_services';
import { getDefaultSort, getSortArray } from '../../../utils/sorting';
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '../../../../common';

import { AppState } from '../services/discover_state';
import { CHART_HIDDEN_KEY } from '../components/layout/use_discover_histogram';

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

  const query = searchSource.getField('query') || data.query.queryString.getDefaultQuery();
  const sort = getSortArray(savedSearch.sort ?? [], dataView!);
  const columns = getDefaultColumns(savedSearch, uiSettings);
  const chartHidden = storage.get(CHART_HIDDEN_KEY);

  const defaultState: AppState = {
    query,
    sort: !sort.length
      ? getDefaultSort(
          dataView,
          uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc'),
          uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)
        )
      : sort,
    columns,
    index: dataView?.id,
    interval: 'auto',
    filters: cloneDeep(searchSource.getOwnField('filter')) as AppState['filters'],
    hideChart: typeof chartHidden === 'boolean' ? chartHidden : undefined,
    viewMode: undefined,
    hideAggregatedPreview: undefined,
    savedQuery: undefined,
    rowHeight: undefined,
    rowsPerPage: undefined,
    grid: undefined,
  };
  if (savedSearch.grid) {
    defaultState.grid = savedSearch.grid;
  }
  if (savedSearch.hideChart !== undefined) {
    defaultState.hideChart = savedSearch.hideChart;
  }
  if (savedSearch.rowHeight !== undefined) {
    defaultState.rowHeight = savedSearch.rowHeight;
  }
  if (savedSearch.viewMode) {
    defaultState.viewMode = savedSearch.viewMode;
  }
  if (savedSearch.hideAggregatedPreview) {
    defaultState.hideAggregatedPreview = savedSearch.hideAggregatedPreview;
  }
  if (savedSearch.rowsPerPage) {
    defaultState.rowsPerPage = savedSearch.rowsPerPage;
  }

  return defaultState;
}
