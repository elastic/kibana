/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';
import {
  UnifiedHistogramApi,
  UnifiedHistogramFetchStatus,
} from '@kbn/unified-histogram-plugin/public';
import { UnifiedHistogramState } from '@kbn/unified-histogram-plugin/public/container/services/state_service';
import { useCallback, useEffect, useRef, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getUiActions } from '../../../../kibana_services';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import type { DataFetch$, SavedSearchData } from '../../hooks/use_saved_search';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { DiscoverStateContainer } from '../../services/discover_state';

export interface UseDiscoverHistogramProps {
  stateContainer: DiscoverStateContainer;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  isPlainRecord: boolean;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
  savedSearchFetch$: DataFetch$;
}

export const useDiscoverHistogram = ({
  stateContainer,
  savedSearchData$,
  dataView,
  isPlainRecord,
  inspectorAdapters,
  searchSessionManager,
  savedSearchFetch$,
}: UseDiscoverHistogramProps) => {
  const services = useDiscoverServices();
  // The searchSessionId will be updated whenever a new search is started
  const searchSessionId = useObservable(searchSessionManager.searchSessionId$);
  // Initialized when the first search has been requested or
  // when in SQL mode since search sessions are not supported
  const isInitialized = Boolean(searchSessionId) || isPlainRecord;

  /**
   * API initialization
   */

  const [unifiedHistogram, setUnifiedHistogram] = useState<UnifiedHistogramApi>();

  const initializeUnifiedHistogram = useCallback(
    (api?: UnifiedHistogramApi) => {
      if (!api || api.initialized || !isInitialized) {
        return;
      }

      const {
        hideChart: chartHidden,
        interval: timeInterval,
        breakdownField,
      } = stateContainer.appState.getState();

      const { fetchStatus: totalHitsStatus, result: totalHitsResult } =
        savedSearchData$.totalHits$.getValue();

      const { query, filters, time: timeRange } = services.data.query.getState();

      api.initialize({
        services: { ...services, uiActions: getUiActions() },
        localStorageKeyPrefix: 'discover',
        disableAutoFetching: true,
        initialState: {
          dataView,
          query,
          filters,
          timeRange,
          chartHidden,
          timeInterval,
          breakdownField: breakdownField ? dataView.getFieldByName(breakdownField) : undefined,
          searchSessionId,
          totalHitsStatus: totalHitsStatus.toString() as UnifiedHistogramFetchStatus,
          totalHitsResult,
          requestAdapter: inspectorAdapters.requests,
        },
      });
    },
    [
      dataView,
      inspectorAdapters.requests,
      isInitialized,
      savedSearchData$.totalHits$,
      searchSessionId,
      services,
      stateContainer.appState,
    ]
  );

  const setUnifiedHistogramApi = useCallback((api: UnifiedHistogramApi | null) => {
    if (!api) {
      return;
    }

    setUnifiedHistogram(api);
  }, []);

  // Initialize Unified Histogram when the first search is requested
  useEffect(() => {
    initializeUnifiedHistogram(unifiedHistogram);
  }, [initializeUnifiedHistogram, isInitialized, unifiedHistogram]);

  /**
   * State syncing
   */

  useEffect(() => {
    if (!unifiedHistogram?.initialized) {
      return;
    }

    const subscription = unifiedHistogram
      .getState$(({ lensRequestAdapter, chartHidden, timeInterval, breakdownField }) => ({
        lensRequestAdapter,
        chartHidden,
        timeInterval,
        breakdownField,
      }))
      .subscribe((state) => {
        inspectorAdapters.lensRequests = state.lensRequestAdapter;

        stateContainer.setAppState({
          hideChart: state.chartHidden,
          interval: state.timeInterval,
          breakdownField: state.breakdownField?.name,
        });
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [inspectorAdapters, stateContainer, unifiedHistogram]);

  const firstLoadComplete = useRef(false);
  const { query, filters, timeRange } = useQuerySubscriber({ data: services.data });
  const { fetchStatus: totalHitsStatus, result: totalHitsResult } = useDataState(
    savedSearchData$.totalHits$
  );

  useEffect(() => {
    if (!unifiedHistogram?.initialized) {
      return;
    }

    let newState: Partial<UnifiedHistogramState> = {
      dataView,
      query,
      filters,
      timeRange,
      searchSessionId,
      requestAdapter: inspectorAdapters.requests,
    };

    // We only want to show the partial results on the first load,
    // or there will be a flickering effect as the loading spinner
    // is quickly shown and hidden again on fetches
    if (!firstLoadComplete.current) {
      newState = {
        ...newState,
        totalHitsStatus: totalHitsStatus.toString() as UnifiedHistogramFetchStatus,
        totalHitsResult,
      };
    }

    unifiedHistogram.updateState(newState);
  }, [
    dataView,
    filters,
    inspectorAdapters.requests,
    query,
    searchSessionId,
    timeRange,
    totalHitsResult,
    totalHitsStatus,
    unifiedHistogram,
  ]);

  /**
   * Total hits
   */

  useEffect(() => {
    if (!unifiedHistogram?.initialized) {
      return;
    }

    const subscription = unifiedHistogram
      .getState$((state) => ({ status: state.totalHitsStatus, result: state.totalHitsResult }))
      .subscribe(({ status, result }) => {
        if (result instanceof Error) {
          // Display the error and set totalHits$ to an error state
          sendErrorTo(services.data, savedSearchData$.totalHits$)(result);
          return;
        }

        const { recordRawType } = savedSearchData$.totalHits$.getValue();

        // Sync the totalHits$ observable with the unified histogram state
        savedSearchData$.totalHits$.next({
          fetchStatus: status.toString() as FetchStatus,
          result,
          recordRawType,
        });

        if (status !== UnifiedHistogramFetchStatus.complete || typeof result !== 'number') {
          return;
        }

        // Check the hits count to set a partial or no results state
        checkHitCount(savedSearchData$.main$, result);

        // Indicate the first load has completed so we don't show
        // partial results on subsequent fetches
        firstLoadComplete.current = true;
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [savedSearchData$.main$, savedSearchData$.totalHits$, services.data, unifiedHistogram]);

  /**
   * Data fetching
   */

  const hideChart = useAppStateSelector((state) => state.hideChart);
  const skipRefetch = useRef<boolean>();

  // Skip refetching when showing the chart since Lens will
  // automatically fetch when the chart is shown
  useEffect(() => {
    if (skipRefetch.current === undefined) {
      skipRefetch.current = false;
    } else {
      skipRefetch.current = !hideChart;
    }
  }, [hideChart]);

  // Trigger a unified histogram refetch when savedSearchFetch$ is triggered
  useEffect(() => {
    const subscription = savedSearchFetch$.subscribe(() => {
      if (unifiedHistogram?.initialized && isInitialized && !skipRefetch.current) {
        unifiedHistogram.refetch();
      }

      skipRefetch.current = false;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isInitialized, savedSearchFetch$, unifiedHistogram]);

  return { hideChart, setUnifiedHistogramApi };
};
