/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useEffect, useState } from 'react';
import { merge, filter } from 'rxjs';
import { isEqual, noop } from 'lodash';
import { isOfAggregateQueryType } from '@kbn/es-query';
import { AbortReason } from '@kbn/kibana-utils-plugin/common';
import { useProfileAccessor } from '../../../../context_awareness';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import {
  selectTab,
  selectTabCombinedFilters,
  selectTabRuntimeState,
  useCurrentTabDataStateContainer,
  useCurrentTabSelector,
  useInternalStateGetState,
  useInternalStateSubscribe,
  useRuntimeStateManager,
} from '../../state_management/redux';
import {
  ACTIVITY_INVESTIGATION_CONFIG,
  fetchActivityInvestigation,
  type ActivityInvestigationResponse,
} from './fetch_activity_investigation';

interface ActivityInvestigationState {
  readonly analysis?: ActivityInvestigationResponse;
  readonly error?: 'failed' | 'timeout';
  readonly errorDetails?: string;
}

/** Observes existing Discover fetches without modifying their lifecycle or the histogram. */
export const useActivityInvestigation = (): ActivityInvestigationState => {
  const services = useDiscoverServices();
  const getRecommendedFieldsAccessor = useProfileAccessor('getRecommendedFields');
  const getState = useInternalStateGetState();
  const subscribe = useInternalStateSubscribe();
  const runtimeStateManager = useRuntimeStateManager();
  const tabId = useCurrentTabSelector((tab) => tab.id);
  const dataState = useCurrentTabDataStateContainer();
  const [state, setState] = useState<ActivityInvestigationState>({});

  useEffect(() => {
    const { recommendedFields } = getRecommendedFieldsAccessor(() => ({
      recommendedFields: [],
    }))();
    const { timefilter } = services.data.query.timefilter;
    const { currentDataView$ } = selectTabRuntimeState(runtimeStateManager, tabId);
    let controller: AbortController | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let removeAbortListener = noop;
    let autoRefresh = false;
    let lastStartedAt = -Infinity;
    let analysisHandled = false;

    const getKey = () => {
      const tab = selectTab(getState(), tabId);
      const dataView = currentDataView$.getValue();
      return JSON.stringify([
        tab?.appState.query,
        tab && selectTabCombinedFilters(tab),
        tab?.esqlVariables,
        tab?.appState.esqlApproximation,
        timefilter.getTime(),
        dataView?.id,
        dataView?.getIndexPattern(),
        dataView?.timeFieldName,
        services.uiSettings.get('dateFormat:tz'),
        services.cps?.cpsManager?.getProjectRouting(),
      ]);
    };

    let contextKey = getKey();
    const cancel = () => {
      controller?.abort();
      controller = undefined;
      clearTimeout(timeout);
      removeAbortListener();
      removeAbortListener = noop;
      setState({});
    };

    const invalidate = () => {
      cancel();
      autoRefresh = false;
      lastStartedAt = -Infinity;
      analysisHandled = false;
      contextKey = getKey();
    };
    const checkContext = () => {
      if (getKey() !== contextKey) invalidate();
    };

    const unsubscribeState = subscribe(checkContext);
    const dataViewSubscription = currentDataView$.subscribe(checkContext);
    const manualRefreshSubscription = merge(
      dataState.refetch$.pipe(filter((value) => value !== 'fetch_more')),
      timefilter.getFetch$(),
      timefilter.getTimeUpdate$()
    ).subscribe(invalidate);
    const autoRefreshSubscription = timefilter.getAutoRefreshFetch$().subscribe(() => {
      autoRefresh = true;
    });

    const documentsSubscription = dataState.data$.documents$.subscribe((documents) => {
      if (
        documents.fetchStatus === FetchStatus.ERROR ||
        documents.fetchStatus === FetchStatus.UNINITIALIZED
      ) {
        invalidate();
        return;
      }
      const isLoading = documents.fetchStatus === FetchStatus.LOADING;
      const hasResults =
        documents.fetchStatus === FetchStatus.COMPLETE ||
        documents.fetchStatus === FetchStatus.PARTIAL;
      if (!isLoading && !hasResults) return;
      checkContext();

      if (isLoading) analysisHandled = false;
      // Initial LOADING can lack a query and is not re-emitted by Discover; recover when results arrive.
      // Once handled, completion must not duplicate a request or retry a failure, timeout or throttled fetch.
      if (analysisHandled) return;
      const isAutoRefresh = autoRefresh;
      autoRefresh = false;
      // Throttle automatic analysis to limit extra searches and repeated cancellation on fast refreshes.
      // This is a load safeguard, not a detector requirement or result expiry; manual refresh bypasses it.
      const skipAutoRefresh =
        isAutoRefresh &&
        Date.now() - lastStartedAt < ACTIVITY_INVESTIGATION_CONFIG.refreshIntervalMs;

      if (!skipAutoRefresh) cancel();
      removeAbortListener();
      const mainSignal = dataState.getAbortController()?.signal;
      const onMainAbort = () => {
        if (mainSignal?.reason !== AbortReason.REPLACED) invalidate();
      };

      if (mainSignal?.aborted) {
        invalidate();
        return;
      }

      mainSignal?.addEventListener('abort', onMainAbort);
      removeAbortListener = () => mainSignal?.removeEventListener('abort', onMainAbort);

      if (skipAutoRefresh) {
        analysisHandled = true;
        return;
      }
      const tab = selectTab(getState(), tabId);
      const dataView = currentDataView$.getValue();
      const query = tab?.appState.query;
      const timeRange = tab?.dataRequestParams.timeRangeAbsolute;

      if (
        !query ||
        !isOfAggregateQueryType(query) ||
        !isEqual(query, documents.query) ||
        !timeRange ||
        !dataView?.timeFieldName ||
        tab.appState.esqlApproximation
      ) {
        return;
      }

      const requestController = new AbortController();
      controller = requestController;
      analysisHandled = true;
      lastStartedAt = Date.now();
      const requestKey = contextKey;
      const isCurrentRequest = () =>
        controller === requestController &&
        !requestController.signal.aborted &&
        requestKey === getKey();
      timeout = setTimeout(() => {
        if (controller !== requestController) return;
        const isCurrentContext = requestKey === getKey();
        cancel();
        if (isCurrentContext) setState({ error: 'timeout' });
      }, ACTIVITY_INVESTIGATION_CONFIG.timeoutMs);

      fetchActivityInvestigation(
        {
          query,
          indexPattern: dataView.getIndexPattern(),
          timeFieldName: dataView.timeFieldName,
          timeRange,
          filters: selectTabCombinedFilters(tab),
          esqlVariables: tab.esqlVariables ?? [],
          projectRouting: services.cps?.cpsManager?.getProjectRouting(),
        },
        services,
        requestController.signal,
        { recommendedFields }
      )
        .then((analysis) => {
          if (isCurrentRequest()) setState({ analysis });
        })
        .catch((error) => {
          if (isCurrentRequest()) {
            setState({
              error: 'failed',
              errorDetails: error instanceof Error ? error.message.slice(0, 500) : undefined,
            });
          }
        })
        .finally(() => {
          if (controller === requestController) clearTimeout(timeout);
        });
    });

    return () => {
      unsubscribeState();
      dataViewSubscription.unsubscribe();
      manualRefreshSubscription.unsubscribe();
      autoRefreshSubscription.unsubscribe();
      documentsSubscription.unsubscribe();
      cancel();
    };
  }, [
    dataState,
    getRecommendedFieldsAccessor,
    getState,
    runtimeStateManager,
    services,
    subscribe,
    tabId,
  ]);

  return state;
};
