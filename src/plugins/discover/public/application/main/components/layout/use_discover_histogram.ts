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
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  map,
  merge,
  Observable,
  pairwise,
  startWith,
} from 'rxjs';
import useObservable from 'react-use/lib/useObservable';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { getUiActions } from '../../../../kibana_services';
import { FetchStatus } from '../../../types';
import { useDataState } from '../../hooks/use_data_state';
import type { InspectorAdapters } from '../../hooks/use_inspector';
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
  const customFilters = useInternalStateSelector((state) => state.customFilters);
  const timefilter = services.data.query.timefilter.timefilter;
  const timeRange = timefilter.getAbsoluteTime();
  const relativeTimeRange = useObservable(
    timefilter.getTimeUpdate$().pipe(map(() => timefilter.getTime())),
    timefilter.getTime()
  );

  // When in text based language mode, update the data view, query, and
  // columns only when documents are done fetching so the Lens suggestions
  // don't frequently change, such as when the user modifies the table
  // columns, which would trigger unnecessary refetches.
  const textBasedFetchComplete$ = useMemo(
    () => createFetchCompleteObservable(stateContainer),
    [stateContainer]
  );

  const {
    dataView: textBasedDataView,
    query: textBasedQuery,
    columns,
  } = useObservable(textBasedFetchComplete$, {
    dataView: stateContainer.internalState.getState().dataView!,
    query: stateContainer.appState.getState().query,
    columns: savedSearchData$.documents$.getValue().textBasedQueryColumns ?? [],
  });

  /**
   * Data fetching
   */

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

  // Handle unified histogram refetching
  useEffect(() => {
    if (!unifiedHistogram) {
      return;
    }

    let fetch$: Observable<string>;

    // When in text based language mode, we refetch under two conditions:
    // 1. When the current Lens suggestion changes. This syncs the visualization
    //    with the user's selection.
    // 2. When the documents are done fetching. This is necessary because we don't
    //    have access to the latest columns until after the documents are fetched,
    //    which are required to get the latest Lens suggestion, which would trigger
    //    a refetch anyway and result in multiple unnecessary fetches.
    if (isPlainRecord) {
      fetch$ = merge(
        createCurrentSuggestionObservable(unifiedHistogram.state$).pipe(map(() => 'lens')),
        textBasedFetchComplete$.pipe(map(() => 'discover'))
      ).pipe(debounceTime(50));
    } else {
      fetch$ = stateContainer.dataState.fetch$.pipe(
        filter(({ options }) => !options.fetchMore), // don't update histogram for "Load more" in the grid
        map(() => 'discover')
      );
    }

    const subscription = fetch$.subscribe((source) => {
      if (!skipRefetch.current) {
        if (source === 'discover') addLog('Unified Histogram - Discover refetch');
        if (source === 'lens') addLog('Unified Histogram - Lens suggestion refetch');
        unifiedHistogram.refetch();
      }

      skipRefetch.current = false;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isPlainRecord, stateContainer.dataState.fetch$, textBasedFetchComplete$, unifiedHistogram]);

  const dataView = useInternalStateSelector((state) => state.dataView!);

  const histogramCustomization = useDiscoverCustomization('unified_histogram');

  return {
    ref,
    getCreationOptions,
    services: { ...services, uiActions: getUiActions() },
    dataView: isPlainRecord ? textBasedDataView : dataView,
    query: isPlainRecord ? textBasedQuery : query,
    filters: [...(filters ?? []), ...customFilters],
    timeRange,
    relativeTimeRange,
    columns,
    onFilter: histogramCustomization?.onFilter,
    onBrushEnd: histogramCustomization?.onBrushEnd,
    withDefaultActions: histogramCustomization?.withDefaultActions,
    disabledActions: histogramCustomization?.disabledActions,
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

const createFetchCompleteObservable = (stateContainer: DiscoverStateContainer) => {
  return stateContainer.dataState.data$.documents$.pipe(
    distinctUntilChanged((prev, curr) => prev.fetchStatus === curr.fetchStatus),
    filter(({ fetchStatus }) => fetchStatus === FetchStatus.COMPLETE),
    map(({ textBasedQueryColumns }) => ({
      dataView: stateContainer.internalState.getState().dataView!,
      query: stateContainer.appState.getState().query!,
      columns: textBasedQueryColumns ?? [],
    }))
  );
};

const createTotalHitsObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map((state) => ({ status: state.totalHitsStatus, result: state.totalHitsResult })),
    distinctUntilChanged((prev, curr) => prev.status === curr.status && prev.result === curr.result)
  );
};

const createCurrentSuggestionObservable = (state$: Observable<UnifiedHistogramState>) => {
  return state$.pipe(
    map((state) => state.currentSuggestion),
    distinctUntilChanged(isEqual)
  );
};
