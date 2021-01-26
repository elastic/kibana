/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */
import { ApplicationStart } from 'kibana/public';
import { QueryState, esFilters } from '../../../../data/public';
import { setStateToKbnUrl } from '../../../../kibana_utils/public';
import { getQueryService, getUISettings } from '../../services';
import { GLOBAL_STATE_STORAGE_KEY } from '../../../common/constants';
import { APP_NAME } from '../visualize_constants';

export const getVisualizeListItem = (
  application: ApplicationStart,
  editApp: string | undefined,
  editUrl: string
) => {
  // for visualizations the editApp is undefined
  let url = application.getUrlForApp(editApp ?? APP_NAME, {
    path: editApp ? editUrl : `#${editUrl}`,
  });
  const queryState: QueryState = {};
  const timeRange = getQueryService().timefilter.timefilter.getTime();
  const filters = getQueryService().filterManager.getFilters();
  const refreshInterval = getQueryService().timefilter.timefilter.getRefreshInterval();

  if (timeRange) queryState.time = timeRange;
  if (filters && filters.length) {
    queryState.filters = filters?.filter((f) => esFilters.isFilterPinned(f));
  }
  if (refreshInterval) queryState.refreshInterval = refreshInterval;
  const useHash = getUISettings().get('state:storeInSessionStorage');
  url = setStateToKbnUrl<QueryState>(GLOBAL_STATE_STORAGE_KEY, queryState, { useHash }, url);
  return url;
};
