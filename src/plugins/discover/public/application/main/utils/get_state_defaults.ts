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
import {
  DEFAULT_COLUMNS_SETTING,
  DOC_HIDE_TIME_COLUMN_SETTING,
  SEARCH_FIELDS_FROM_SOURCE,
  SORT_DEFAULT_ORDER_SETTING,
} from '@kbn/discover-utils';
import { DiscoverAppState } from '../services/discover_app_state_container';
import { DiscoverServices } from '../../../build_services';
import { getDefaultSort, getSortArray } from '../../../utils/sorting';
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

export async function getStateDefaults({
  savedSearch,
  services,
}: {
  savedSearch: SavedSearch;
  services: DiscoverServices;
}) {
  const { searchSource } = savedSearch;
  const { data, uiSettings, storage } = services;
  const dataView = await searchSource.getDataView();

  const query = searchSource.getField('query') || data.query.queryString.getDefaultQuery();
  const isTextBasedQueryMode = isTextBasedQuery(query);
  const sort = getSortArray(savedSearch.sort ?? [], dataView!);
  const columns = getDefaultColumns(savedSearch, uiSettings);
  const chartHidden = getChartHidden(storage, 'discover');

  const defaultState: DiscoverAppState = {
    query,
    sort: !sort.length
      ? getDefaultSort(
          dataView,
          uiSettings.get(SORT_DEFAULT_ORDER_SETTING, 'desc'),
          uiSettings.get(DOC_HIDE_TIME_COLUMN_SETTING, false)
        )
      : sort,
    columns,
    index: isTextBasedQueryMode ? undefined : dataView?.id,
    interval: 'auto',
    filters: cloneDeep(searchSource.getOwnField('filter')) as DiscoverAppState['filters'],
    hideChart: typeof chartHidden === 'boolean' ? chartHidden : undefined,
    viewMode: undefined,
    hideAggregatedPreview: undefined,
    savedQuery: undefined,
    rowHeight: undefined,
    headerRowHeight: undefined,
    rowsPerPage: undefined,
    sampleSize: undefined,
    grid: undefined,
    breakdownField: undefined,
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
  if (savedSearch.headerRowHeight !== undefined) {
    defaultState.headerRowHeight = savedSearch.headerRowHeight;
  }
  if (savedSearch.viewMode) {
    defaultState.viewMode = getValidViewMode({
      viewMode: savedSearch.viewMode,
      isTextBasedQueryMode,
    });
  }
  if (savedSearch.hideAggregatedPreview) {
    defaultState.hideAggregatedPreview = savedSearch.hideAggregatedPreview;
  }
  if (savedSearch.rowsPerPage) {
    defaultState.rowsPerPage = savedSearch.rowsPerPage;
  }
  if (savedSearch.sampleSize) {
    defaultState.sampleSize = savedSearch.sampleSize;
  }
  if (savedSearch.breakdownField) {
    defaultState.breakdownField = savedSearch.breakdownField;
  }

  return defaultState;
}
