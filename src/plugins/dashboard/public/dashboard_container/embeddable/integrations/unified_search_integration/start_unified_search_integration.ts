/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';
import { GlobalQueryStateFromUrl, syncGlobalQueryStateWithUrl } from '@kbn/data-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { syncUnifiedSearchState } from './sync_unified_search_state';
import { pluginServices } from '../../../../services/plugin_services';
import { DashboardContainerByValueInput } from '../../../../../common';

/**
 * Applies initial state to the query service, and the saved dashboard search source
 * Sets up syncing and subscriptions between the filter state from the Data plugin
 * and the dashboard Redux store.
 */
export function startUnifiedSearchIntegration(
  this: DashboardContainer,
  {
    kbnUrlStateStorage,
    setCleanupFunction,
    initialInput,
  }: {
    kbnUrlStateStorage: IKbnUrlStateStorage;
    initialInput: DashboardContainerByValueInput;
    setCleanupFunction: (cleanupFunction: () => void) => void;
  }
) {
  const {
    data: { query: queryService },
  } = pluginServices.getServices();
  const {
    timefilter: { timefilter: timefilterService },
  } = queryService;

  // starts syncing `_g` portion of url with query services
  const { stop: stopSyncingQueryServiceStateWithUrl } = syncGlobalQueryStateWithUrl(
    queryService,
    kbnUrlStateStorage
  );

  // apply initial dashboard saved query to the query bar.
  applySavedFiltersToUnifiedSearch({
    currentDashboardState: initialInput,
    kbnUrlStateStorage,
  });

  const initialTimeRange = initialInput.timeRestore ? undefined : timefilterService.getTime();
  this.untilInitialized().then(() => {
    const stopSyncingUnifiedSearchState = syncUnifiedSearchState.bind(this)(kbnUrlStateStorage);
    setCleanupFunction(() => {
      stopSyncingUnifiedSearchState();
      stopSyncingQueryServiceStateWithUrl();
    });
  });
  return initialTimeRange;
}

export const applySavedFiltersToUnifiedSearch = ({
  currentDashboardState,
  kbnUrlStateStorage,
}: {
  currentDashboardState: DashboardContainerByValueInput;
  kbnUrlStateStorage: IKbnUrlStateStorage;
}) => {
  const {
    data: {
      query: { filterManager, queryString, timefilter },
    },
  } = pluginServices.getServices();
  const { timefilter: timefilterService } = timefilter;

  // apply filters and query to the query service
  filterManager.setAppFilters(cloneDeep(currentDashboardState.filters ?? []));
  queryString.setQuery(currentDashboardState.query ?? queryString.getDefaultQuery());

  /**
   * If a global time range is not set explicitly and the time range was saved with the dashboard, apply
   * time range and refresh interval to the query service.
   */
  if (currentDashboardState.timeRestore) {
    const globalQueryState = kbnUrlStateStorage.get<GlobalQueryStateFromUrl>('_g');
    if (!globalQueryState?.time && currentDashboardState.timeRange) {
      timefilterService.setTime(currentDashboardState.timeRange);
    }
    if (!globalQueryState?.refreshInterval && currentDashboardState.refreshInterval) {
      timefilterService.setRefreshInterval(currentDashboardState.refreshInterval);
    }
  }
};
