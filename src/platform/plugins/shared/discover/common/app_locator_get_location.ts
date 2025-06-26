/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { GlobalQueryStateFromUrl } from '@kbn/data-plugin/public';
import { isFilterPinned, isOfAggregateQueryType } from '@kbn/es-query';
import type { setStateToKbnUrl as setStateToKbnUrlCommon } from '@kbn/kibana-utils-plugin/common';
import type { DiscoverAppLocatorGetLocation, MainHistoryLocationState } from './app_locator';
import type { DiscoverAppState } from '../public';
import { createDataViewDataSource, createEsqlDataSource } from './data_sources';
import { APP_STATE_URL_KEY } from './constants';

export const appLocatorGetLocationCommon = async (
  {
    useHash: useHashOriginal,
    setStateToKbnUrl,
  }: {
    useHash: boolean;
    setStateToKbnUrl: typeof setStateToKbnUrlCommon;
  },
  ...[params]: Parameters<DiscoverAppLocatorGetLocation>
): ReturnType<DiscoverAppLocatorGetLocation> => {
  const {
    useHash = useHashOriginal,
    filters,
    dataViewId,
    indexPatternId,
    dataViewSpec,
    query,
    refreshInterval,
    savedSearchId,
    timeRange,
    searchSessionId,
    columns,
    grid,
    savedQuery,
    sort,
    interval,
    viewMode,
    hideAggregatedPreview,
    breakdownField,
    isAlertResults,
  } = params;
  const savedSearchPath = savedSearchId ? `view/${encodeURIComponent(savedSearchId)}` : '';
  const appState: Partial<DiscoverAppState> = {};
  const queryState: GlobalQueryStateFromUrl = {};

  if (query) appState.query = query;
  if (filters && filters.length) appState.filters = filters?.filter((f) => !isFilterPinned(f));
  if (indexPatternId)
    appState.dataSource = createDataViewDataSource({ dataViewId: indexPatternId });
  if (dataViewId) appState.dataSource = createDataViewDataSource({ dataViewId });
  if (isOfAggregateQueryType(query)) appState.dataSource = createEsqlDataSource();
  if (columns) appState.columns = columns;
  if (grid) appState.grid = grid;
  if (savedQuery) appState.savedQuery = savedQuery;
  if (sort) appState.sort = sort;
  if (interval) appState.interval = interval;
  if (timeRange) queryState.time = timeRange;
  if (filters && filters.length) queryState.filters = filters?.filter((f) => isFilterPinned(f));
  if (refreshInterval) queryState.refreshInterval = refreshInterval;
  if (viewMode) appState.viewMode = viewMode;
  if (hideAggregatedPreview) appState.hideAggregatedPreview = hideAggregatedPreview;
  if (breakdownField) appState.breakdownField = breakdownField;

  const state: MainHistoryLocationState = {};
  if (dataViewSpec) state.dataViewSpec = dataViewSpec;
  if (isAlertResults) state.isAlertResults = isAlertResults;

  let path = `#/${savedSearchPath}`;

  if (searchSessionId) {
    path = `${path}?searchSessionId=${searchSessionId}`;
  }

  if (Object.keys(queryState).length) {
    path = setStateToKbnUrl<GlobalQueryStateFromUrl>('_g', queryState, { useHash }, path);
  }

  if (Object.keys(appState).length) {
    path = setStateToKbnUrl(APP_STATE_URL_KEY, appState, { useHash }, path);
  }

  return {
    app: 'discover',
    path,
    state,
  };
};
