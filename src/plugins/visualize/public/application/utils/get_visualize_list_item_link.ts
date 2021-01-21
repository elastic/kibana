/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { ApplicationStart } from 'kibana/public';
import {
  Filter,
  Query,
  esFilters,
  QueryState,
  TimeRange,
  RefreshInterval,
} from '../../../../data/public';
import { setStateToKbnUrl } from '../../../../kibana_utils/public';
import { getQueryService, getUISettings } from '../../services';
import { STATE_STORAGE_KEY, GLOBAL_STATE_STORAGE_KEY } from '../../../common/constants';

export const propagateUrlQueries = (
  url: string,
  useHash: boolean,
  query?: Query,
  filters?: Filter[],
  timeRange?: TimeRange,
  vis?: unknown,
  refreshInterval?: RefreshInterval
) => {
  const appState: {
    query?: Query;
    filters?: Filter[];
    vis?: unknown;
  } = {};
  const queryState: QueryState = {};

  if (query) appState.query = query;
  if (filters && filters.length)
    appState.filters = filters?.filter((f) => !esFilters.isFilterPinned(f));
  if (vis) appState.vis = vis;

  if (timeRange) queryState.time = timeRange;
  if (filters && filters.length)
    queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
  if (refreshInterval) queryState.refreshInterval = refreshInterval;

  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
  url = setStateToKbnUrl(STATE_STORAGE_KEY, appState, { useHash }, url);

  return url;
};

export const getVisualizeListItem = (
  application: ApplicationStart,
  editApp: string | undefined,
  editUrl: string
) => {
  const url = application.getUrlForApp(editApp ?? 'visualize', {
    path: editApp ? editUrl : `/#${editUrl}`,
  });
  const query = getQueryService().queryString.getQuery();
  const filters = getQueryService().filterManager.getFilters();
  const timeRange = getQueryService().timefilter.timefilter.getTime();

  const useHash = getUISettings().get('state:storeInSessionStorage');
  return propagateUrlQueries(url, useHash, query, filters, timeRange);
};
