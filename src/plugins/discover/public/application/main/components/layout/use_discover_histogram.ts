/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuerySubscriber } from '@kbn/unified-field-list/src/hooks/use_query_subscriber';
import {
  UnifiedHistogramApi,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramState,
} from '@kbn/unified-histogram-plugin/public';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useRef, useMemo, useState } from 'react';
import { distinctUntilChanged, filter, map, Observable, pairwise, startWith } from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { Suggestion } from '@kbn/lens-plugin/public';
import useLatest from 'react-use/lib/useLatest';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getUiActions } from '../../../../kibana_services';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import type { DataDocuments$ } from '../../services/discover_data_state_container';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { addLog } from '../../../../utils/add_log';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import type { DiscoverAppState } from '../../services/discover_app_state_container';

export interface UseDiscoverHistogramProps {
  stateContainer: DiscoverStateContainer;
  inspectorAdapters: InspectorAdapters;
  hideChart: boolean | undefined;
  isPlainRecord: boolean;
}

export const useDiscoverHistogram = ({
  stateContainer,
  inspectorAdapters,
  hideChart,
  isPlainRecord,
}: UseDiscoverHistogramProps) => {
  const services = useDiscoverServices();
  const savedSearchData$ = stateContainer.dataState.data$;

  /**
   * API initialization
   */

  const [unifiedHistogram, ref] = useState<UnifiedHistogramApi | null>();

  const getCreationOptions = useCallback(() => {
    const {
      hideChart: chartHidden,
      interval: timeInterval,
      breakdownField,
    } = stateContainer.appState.getState();

    const { fetchStatus: totalHitsStatus, result: totalHitsResult } =
      savedSearchData$.totalHits$.getValue();

    return {
      localStorageKeyPrefix: 'discover',
      disableAutoFetching: true,
      initialState: {
        chartHidden,
        timeInterval,
        breakdownField,
        totalHitsStatus: totalHitsStatus.toString() as UnifiedHistogramFetchStatus,
        totalHitsResult,
      },
    };
  }, [savedSearchData$.totalHits$, stateContainer.appState]);

  /**
   * Sync Unified Histogram state with Discover state
   */

  useEffect(() => {
    const subscription = createUnifiedHistogramStateObservable(unifiedHistogram?.state$)?.subscribe(
      (changes) => {
        const { lensRequestAdapter, ...stateChanges } = changes;
        const appState = stateContainer.appState.getState();
        const oldState = {
          hideChart: appState.hideChart,
          interval: appState.interval,
          breakdownField: appState.breakdownField,
        };
        const newState = { ...oldState, ...stateChanges };

        if ('lensRequestAdapter' in changes) {
          inspectorAdapters.lensRequests = lensRequestAdapter;
        }

        if (!isEqual(oldState, newState)) {
          stateContainer.appState.update(newState);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [inspectorAdapters, stateContainer.appState, unifiedHistogram?.state$]);

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

  useEffect(() => {
    const subscription = createAppStateObservable(stateContainer.appState.state$).subscribe(
      (changes) => {
        if ('breakdownField' in changes) {
          unifiedHistogram?.setBreakdownField(changes.breakdownField);
        }

        if ('timeInterval' in changes && changes.timeInterval) {
          unifiedHistogram?.setTimeInterval(changes.timeInterval);
        }

        if ('chartHidden' in changes && typeof changes.chartHidden === 'boolean') {
          unifiedHistogram?.setChartHidden(changes.chartHidden);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [stateContainer.appState.state$, unifiedHistogram]);

  /**
   * Columns
   */

  // Update the columns only when documents are fetched so the Lens suggestions
  // don't constantly change when the user modifies the table columns
  const columnsObservable = useMemo(
    () => createColumnsObservable(savedSearchData$.documents$),
    [savedSearchData$.documents$]
  );

  const columns = useObservable(
    columnsObservable,
    savedSearchData$.documents$.getValue().textBasedQueryColumns?.map(({ name }) => name) ?? []
  );

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
   * Request params
   */
  const { query, filters } = useQuerySubscriber({ data: services.data });
  const timefilter = services.data.query.timefilter.timefilter;
  const timeRange = timefilter.getAbsoluteTime();
  const relativeTimeRange = useObservable(
    timefilter.getTimeUpdate$().pipe(map(() => timefilter.getTime())),
    timefilter.getTime()
  );

  /**
   * Data fetching
   */

  const savedSearchFetch$ = stateContainer.dataState.fetch$;
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
  const dataViewId = useInternalStateSelector((state) => state.dataView?.id);
  const skipFetchParams = useRef({ dataViewId, query });

  useEffect(() => {
    const newSkipFetchParams = { dataViewId, query };

    if (isEqual(skipFetchParams.current, newSkipFetchParams)) {
      return;
    }

    skipFetchParams.current = newSkipFetchParams;

    if (usingLensSuggestion.current) {
      skipLensSuggestionRefetch.current = true;
      skipDiscoverRefetch.current = true;
    }
  }, [dataViewId, query, usingLensSuggestion]);

  return {
    ref,
    getCreationOptions,
    services: { ...services, uiActions: getUiActions() },
    query,
    filters,
    timeRange,
    relativeTimeRange,
    columns,
  };
};

// Use pairwise to diff the previous and current state (starting with undefined to ensure
// pairwise triggers after a single emission), and return an object containing only the
// changed properties. By only including the changed properties, we avoid accidentally
// overwriting other state properties that may have been updated between the time this
// obersverable was triggered and the time the state changes are applied.
const createUnifiedHistogramStateObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: Partial<DiscoverAppState> & { lensRequestAdapter?: RequestAdapter } = {};

      if (!curr) {
        return changes;
      }

      if (prev?.lensRequestAdapter !== curr.lensRequestAdapter) {
        changes.lensRequestAdapter = curr.lensRequestAdapter;
      }

      if (prev?.chartHidden !== curr.chartHidden) {
        changes.hideChart = curr.chartHidden;
      }

      if (prev?.timeInterval !== curr.timeInterval) {
        changes.interval = curr.timeInterval;
      }

      if (prev?.breakdownField !== curr.breakdownField) {
        changes.breakdownField = curr.breakdownField;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};

const createAppStateObservable = (state$: Observable<DiscoverAppState>) => {
  return state$.pipe(
    startWith(undefined),
    pairwise(),
    map(([prev, curr]) => {
      const changes: Partial<UnifiedHistogramState> = {};

      if (!curr) {
        return changes;
      }

      if (prev?.breakdownField !== curr.breakdownField) {
        changes.breakdownField = curr.breakdownField;
      }

      if (prev?.interval !== curr.interval) {
        changes.timeInterval = curr.interval;
      }

      if (prev?.hideChart !== curr.hideChart) {
        changes.chartHidden = curr.hideChart;
      }

      return changes;
    }),
    filter((changes) => Object.keys(changes).length > 0)
  );
};

const createColumnsObservable = (documents$: DataDocuments$) => {
  return documents$.pipe(
    distinctUntilChanged((prev, curr) => prev.fetchStatus === curr.fetchStatus),
    filter(({ fetchStatus }) => fetchStatus === FetchStatus.COMPLETE),
    map(({ textBasedQueryColumns }) => textBasedQueryColumns?.map(({ name }) => name) ?? [])
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
