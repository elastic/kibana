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
  UnifiedHistogramInitializedApi,
  UnifiedHistogramState,
} from '@kbn/unified-histogram-plugin/public';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { distinctUntilChanged, filter, map, Observable, skip } from 'rxjs';
import type { Suggestion } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getUiActions } from '../../../../kibana_services';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import type {
  DataDocuments$,
  DataFetch$,
  SavedSearchData,
} from '../../services/discover_data_state_container';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { addLog } from '../../../../utils/add_log';

export interface UseDiscoverHistogramProps {
  stateContainer: DiscoverStateContainer;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  inspectorAdapters: InspectorAdapters;
  savedSearchFetch$: DataFetch$;
  searchSessionId: string | undefined;
  isPlainRecord: boolean;
}

export const useDiscoverHistogram = ({
  stateContainer,
  savedSearchData$,
  dataView,
  inspectorAdapters,
  savedSearchFetch$,
  searchSessionId,
  isPlainRecord,
}: UseDiscoverHistogramProps) => {
  const services = useDiscoverServices();
  const timefilter = services.data.query.timefilter.timefilter;

  /**
   * API initialization
   */

  const [unifiedHistogram, setUnifiedHistogram] = useState<UnifiedHistogramInitializedApi>();

  const setUnifiedHistogramApi = useCallback(
    (api: UnifiedHistogramApi | null) => {
      if (!api) {
        return;
      }

      if (api.initialized) {
        setUnifiedHistogram(api);
      } else {
        const {
          hideChart: chartHidden,
          interval: timeInterval,
          breakdownField,
          columns,
        } = stateContainer.appState.getState();

        const { fetchStatus: totalHitsStatus, result: totalHitsResult } =
          savedSearchData$.totalHits$.getValue();

        const { query, filters, time: timeRange } = services.data.query.getState();

        api.initialize({
          services: { ...services, uiActions: getUiActions() },
          localStorageKeyPrefix: 'discover',
          disableAutoFetching: true,
          getRelativeTimeRange: timefilter.getTime,
          initialState: {
            dataView,
            query,
            filters,
            timeRange,
            chartHidden,
            timeInterval,
            columns,
            breakdownField,
            searchSessionId,
            totalHitsStatus: totalHitsStatus.toString() as UnifiedHistogramFetchStatus,
            totalHitsResult,
            requestAdapter: inspectorAdapters.requests,
          },
        });
      }
    },
    [
      dataView,
      inspectorAdapters.requests,
      savedSearchData$.totalHits$,
      searchSessionId,
      services,
      stateContainer.appState,
      timefilter.getTime,
    ]
  );

  /**
   * Sync Unified Histogram state with Discover state
   */

  useEffect(() => {
    const subscription = createStateSyncObservable(unifiedHistogram?.state$)?.subscribe((state) => {
      inspectorAdapters.lensRequests = state.lensRequestAdapter;

      const { hideChart, interval, breakdownField } = stateContainer.appState.getState();
      const oldState = { hideChart, interval, breakdownField };
      const newState = {
        hideChart: state.chartHidden,
        interval: state.timeInterval,
        breakdownField: state.breakdownField,
      };

      if (!isEqual(oldState, newState)) {
        stateContainer.appState.update(newState);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [inspectorAdapters, stateContainer, unifiedHistogram]);

  /**
   * Update Unified Histgoram request params
   */
  const { query, filters } = useQuerySubscriber({ data: services.data });
  const timeRange = timefilter.getAbsoluteTime();

  useEffect(() => {
    unifiedHistogram?.setRequestParams({
      dataView,
      query,
      filters,
      timeRange,
      searchSessionId,
      requestAdapter: inspectorAdapters.requests,
    });
  }, [
    dataView,
    filters,
    inspectorAdapters.requests,
    query,
    searchSessionId,
    timeRange,
    unifiedHistogram,
  ]);

  /**
   * Override Unified Histgoram total hits with Discover partial results
   */

  const firstLoadComplete = useRef(false);

  const { fetchStatus: totalHitsStatus, result: totalHitsResult } = useDataState(
    savedSearchData$.totalHits$
  );

  useEffect(() => {
    // We only want to show the partial results on the first load,
    // or there will be a flickering effect as the loading spinner
    // is quickly shown and hidden again on fetches
    if (!firstLoadComplete.current) {
      unifiedHistogram?.setTotalHits({
        totalHitsStatus: totalHitsStatus.toString() as UnifiedHistogramFetchStatus,
        totalHitsResult,
      });
    }
  }, [totalHitsResult, totalHitsStatus, unifiedHistogram]);

  /**
   * Sync URL query params with Unified Histogram
   */

  const hideChart = useAppStateSelector((state) => state.hideChart);

  useEffect(() => {
    if (typeof hideChart === 'boolean') {
      unifiedHistogram?.setChartHidden(hideChart);
    }
  }, [hideChart, unifiedHistogram]);

  const timeInterval = useAppStateSelector((state) => state.interval);

  useEffect(() => {
    if (timeInterval) {
      unifiedHistogram?.setTimeInterval(timeInterval);
    }
  }, [timeInterval, unifiedHistogram]);

  const breakdownField = useAppStateSelector((state) => state.breakdownField);

  useEffect(() => {
    unifiedHistogram?.setBreakdownField(breakdownField);
  }, [breakdownField, unifiedHistogram]);

  /**
   * Columns
   */

  // Update the columns only when documents are fetched so the Lens suggestions
  // don't constantly change when the user modifies the table columns
  useEffect(() => {
    const subscription = createDocumentsFetchedObservable(
      stateContainer.dataState.data$.documents$
    ).subscribe(({ textBasedQueryColumns }) => {
      const columns = textBasedQueryColumns?.map(({ name }) => name) ?? [];
      unifiedHistogram?.setColumns(columns);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [stateContainer.appState, stateContainer.dataState.data$.documents$, unifiedHistogram]);

  /**
   * Total hits
   */

  const setTotalHitsError = useMemo(
    () => sendErrorTo(savedSearchData$.totalHits$),
    [savedSearchData$.totalHits$]
  );

  useEffect(() => {
    const subscription = createTotalHitsObservable(unifiedHistogram?.state$)?.subscribe(
      ({ status, result }) => {
        if (result instanceof Error) {
          // Set totalHits$ to an error state
          setTotalHitsError(result);
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
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [
    savedSearchData$.main$,
    savedSearchData$.totalHits$,
    setTotalHitsError,
    unifiedHistogram?.state$,
  ]);

  /**
   * Data fetching
   */

  const skipDiscoverRefetch = useRef<boolean>();
  const skipLensSuggestionRefetch = useRef<boolean>();
  const usingLensSuggestion = useLatest(isPlainRecord && !hideChart);

  // Skip refetching when showing the chart since Lens will
  // automatically fetch when the chart is shown
  useEffect(() => {
    if (skipDiscoverRefetch.current === undefined) {
      skipDiscoverRefetch.current = false;
    } else {
      skipDiscoverRefetch.current = !hideChart;
    }
  }, [hideChart]);

  // Trigger a unified histogram refetch when savedSearchFetch$ is triggered
  useEffect(() => {
    const subscription = savedSearchFetch$.subscribe(() => {
      if (!skipDiscoverRefetch.current) {
        addLog('Unified Histogram - Discover refetch');
        unifiedHistogram?.refetch();
      }

      skipDiscoverRefetch.current = false;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [savedSearchFetch$, unifiedHistogram, usingLensSuggestion]);

  // Reload the chart when the current suggestion changes
  const [currentSuggestion, setCurrentSuggestion] = useState<Suggestion>();

  useEffect(() => {
    if (!skipLensSuggestionRefetch.current && currentSuggestion && usingLensSuggestion.current) {
      addLog('Unified Histogram - Lens suggestion refetch');
      unifiedHistogram?.refetch();
    }

    skipLensSuggestionRefetch.current = false;
  }, [currentSuggestion, unifiedHistogram, usingLensSuggestion]);

  useEffect(() => {
    const subscription = createCurrentSuggestionObservable(unifiedHistogram?.state$)?.subscribe(
      setCurrentSuggestion
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [unifiedHistogram]);

  // When the data view or query changes, which will trigger a current suggestion change,
  // skip the next refetch since we want to wait for the columns to update first, which
  // doesn't happen until after the documents are fetched
  useEffect(() => {
    const subscription = createSkipFetchObservable(unifiedHistogram?.state$)?.subscribe(() => {
      if (usingLensSuggestion.current) {
        skipLensSuggestionRefetch.current = true;
        skipDiscoverRefetch.current = true;
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [unifiedHistogram?.state$, usingLensSuggestion]);

  return { hideChart, setUnifiedHistogramApi };
};

const createStateSyncObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map(({ lensRequestAdapter, chartHidden, timeInterval, breakdownField }) => ({
      lensRequestAdapter,
      chartHidden,
      timeInterval,
      breakdownField,
    })),
    distinctUntilChanged((prev, curr) => {
      const { lensRequestAdapter: prevLensRequestAdapter, ...prevRest } = prev;
      const { lensRequestAdapter: currLensRequestAdapter, ...currRest } = curr;

      return prevLensRequestAdapter === currLensRequestAdapter && isEqual(prevRest, currRest);
    })
  );
};

const createDocumentsFetchedObservable = (documents$: DataDocuments$) => {
  return documents$.pipe(
    distinctUntilChanged((prev, curr) => prev.fetchStatus === curr.fetchStatus),
    filter(({ fetchStatus }) => fetchStatus === FetchStatus.COMPLETE)
  );
};

const createTotalHitsObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map((state) => ({ status: state.totalHitsStatus, result: state.totalHitsResult })),
    distinctUntilChanged((prev, curr) => prev.status === curr.status && prev.result === curr.result)
  );
};

const createCurrentSuggestionObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map((state) => state.currentSuggestion),
    distinctUntilChanged(isEqual)
  );
};

const createSkipFetchObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map((state) => [state.dataView.id, state.query]),
    distinctUntilChanged(isEqual),
    skip(1)
  );
};
