/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { cloneDeep } from 'lodash';

import { IKbnUrlStateStorage } from '@kbn/kibana-utils-plugin/public';

import { DashboardContainer } from '../../dashboard_container';
import { syncUnifiedSearchState } from './sync_dashboard_unified_search_state';
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
    initialInput,
    setCleanupFunction,
    kbnUrlStateStorage,
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

  // apply initial dashboard saved filters, query, and time range to the query bar.
  applySavedFiltersToUnifiedSearch.bind(this)(initialInput);

  const initialTimeRange = initialInput.timeRestore ? undefined : timefilterService.getTime();
  this.untilInitialized().then(() => {
    const stopSyncingUnifiedSearchState = syncUnifiedSearchState.bind(this)(kbnUrlStateStorage);
    setCleanupFunction(() => {
      stopSyncingUnifiedSearchState?.();
    });
  });
  return initialTimeRange;
}

export function applySavedFiltersToUnifiedSearch(
  this: DashboardContainer,
  initialInput?: DashboardContainerByValueInput
) {
  const {
    data: {
      query: { filterManager, queryString, timefilter },
    },
  } = pluginServices.getServices();
  const { timefilter: timefilterService } = timefilter;

  const input = initialInput
    ? initialInput
    : this.getReduxEmbeddableTools().getState().explicitInput;
  const { filters, query, timeRestore, timeRange, refreshInterval } = input;

  // apply filters and query to the query service
  filterManager.setAppFilters(cloneDeep(filters ?? []));
  queryString.setQuery(query ?? queryString.getDefaultQuery());

  /**
   * If a global time range is not set explicitly and the time range was saved with the dashboard, apply
   * time range and refresh interval to the query service.
   */
  if (timeRestore) {
    if (timeRange) timefilterService.setTime(timeRange);
    if (refreshInterval) timefilterService.setRefreshInterval(refreshInterval);
  }
}
