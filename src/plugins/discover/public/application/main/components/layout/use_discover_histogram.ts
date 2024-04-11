/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { useQuerySubscriber } from '@kbn/unified-field-list/src/hooks/use_query_subscriber';
import {
  canImportVisContext,
  UnifiedHistogramApi,
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramState,
  UnifiedHistogramVisContext,
} from '@kbn/unified-histogram-plugin/public';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/common';
import type { Filter } from '@kbn/es-query';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { FetchStatus } from '../../../types';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { addLog } from '../../../../utils/add_log';
import { useInternalStateSelector } from '../../services/discover_internal_state_container';
import type { DiscoverAppState } from '../../services/discover_app_state_container';
import { DataDocumentsMsg, RecordRawType } from '../../services/discover_data_state_container';
import { useSavedSearch } from '../../services/discover_state_provider';

const EMPTY_TEXT_BASED_COLUMNS: DatatableColumn[] = [];
const EMPTY_FILTERS: Filter[] = [];

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
  const savedSearchState = useSavedSearch();

  /**
   * API initialization
   */

  const [unifiedHistogram, ref] = useState<UnifiedHistogramApi | null>();
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  const getCreationOptions = useCallback(() => {
    const {
      hideChart: chartHidden,
      interval: timeInterval,
      breakdownField,
    } = stateContainer.appState.getState();

    return {
      localStorageKeyPrefix: 'discover',
      disableAutoFetching: true,
      initialState: {
        chartHidden,
        timeInterval,
        breakdownField,
        totalHitsStatus: UnifiedHistogramFetchStatus.loading,
        totalHitsResult: undefined,
      },
    };
  }, [stateContainer.appState]);

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
        const { recordRawType, result: totalHitsResult } = savedSearchData$.totalHits$.getValue();

        if (recordRawType === RecordRawType.PLAIN) {
          // ignore histogram's total hits updates for text-based records as Discover manages them during docs fetching
          return;
        }

        if (result instanceof Error) {
          // Set totalHits$ to an error state
          setTotalHitsError(result);
          return;
        }

        if (
          (status === UnifiedHistogramFetchStatus.loading ||
            status === UnifiedHistogramFetchStatus.uninitialized) &&
          totalHitsResult &&
          typeof result !== 'number'
        ) {
          // ignore the histogram initial loading state if discover state already has a total hits value
          return;
        }

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

  const [initialTextBasedProps] = useState(() =>
    getUnifiedHistogramPropsForTextBased({
      documentsValue: savedSearchData$.documents$.getValue(),
      savedSearch: stateContainer.savedSearchState.getState(),
    })
  );

  const {
    dataView: textBasedDataView,
    query: textBasedQuery,
    columns: textBasedColumns,
  } = useObservable(textBasedFetchComplete$, initialTextBasedProps);

  useEffect(() => {
    if (!isPlainRecord) {
      return;
    }

    const fetchStart = stateContainer.dataState.fetch$.subscribe(() => {
      if (!skipRefetch.current) {
        setIsSuggestionLoading(true);
      }
    });
    const fetchComplete = textBasedFetchComplete$.subscribe(() => {
      setIsSuggestionLoading(false);
    });

    return () => {
      fetchStart.unsubscribe();
      fetchComplete.unsubscribe();
    };
  }, [isPlainRecord, stateContainer.dataState.fetch$, textBasedFetchComplete$]);

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

    // triggering the initial request for total hits hook
    if (!isPlainRecord && !skipRefetch.current) {
      unifiedHistogram.refetch();
    }

    return () => {
      subscription.unsubscribe();
    };
  }, [isPlainRecord, stateContainer.dataState.fetch$, textBasedFetchComplete$, unifiedHistogram]);

  const dataView = useInternalStateSelector((state) => state.dataView!);

  const histogramCustomization = useDiscoverCustomization('unified_histogram');

  const filtersMemoized = useMemo(() => {
    const allFilters = [...(filters ?? []), ...customFilters];
    return allFilters.length ? allFilters : EMPTY_FILTERS;
  }, [filters, customFilters]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeRangeMemoized = useMemo(() => timeRange, [timeRange?.from, timeRange?.to]);

  const onVisContextChanged = useCallback(
    (
      nextVisContext: UnifiedHistogramVisContext | undefined,
      externalVisContextStatus: UnifiedHistogramExternalVisContextStatus
    ) => {
      switch (externalVisContextStatus) {
        case UnifiedHistogramExternalVisContextStatus.manuallyCustomized:
          // if user customized the visualization manually
          // (only this action should trigger Unsaved changes badge)
          stateContainer.savedSearchState.updateVisContext({
            nextVisContext,
          });
          stateContainer.internalState.transitions.setOverriddenVisContextAfterInvalidation(
            undefined
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.automaticallyOverridden:
          // if the visualization was invalidated as incompatible and rebuilt
          // (it will be used later for saving the visualization via Save button)
          stateContainer.internalState.transitions.setOverriddenVisContextAfterInvalidation(
            nextVisContext
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.automaticallyCreated:
        case UnifiedHistogramExternalVisContextStatus.applied:
          // clearing the value in the internal state so we don't use it during saved search saving
          stateContainer.internalState.transitions.setOverriddenVisContextAfterInvalidation(
            undefined
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.unknown:
          // using `{}` to overwrite the value inside the saved search SO during saving
          stateContainer.internalState.transitions.setOverriddenVisContextAfterInvalidation({});
          break;
      }
    },
    [stateContainer]
  );

  return {
    ref,
    getCreationOptions,
    services,
    dataView: isPlainRecord ? textBasedDataView : dataView,
    query: isPlainRecord ? textBasedQuery : query,
    filters: filtersMemoized,
    timeRange: timeRangeMemoized,
    relativeTimeRange,
    columns: isPlainRecord ? textBasedColumns : undefined,
    onFilter: histogramCustomization?.onFilter,
    onBrushEnd: histogramCustomization?.onBrushEnd,
    withDefaultActions: histogramCustomization?.withDefaultActions,
    disabledActions: histogramCustomization?.disabledActions,
    isChartLoading: isSuggestionLoading,
    // visContext should be in sync with current query
    externalVisContext:
      isPlainRecord && canImportVisContext(savedSearchState?.visContext)
        ? savedSearchState?.visContext
        : undefined,
    onVisContextChanged: isPlainRecord ? onVisContextChanged : undefined,
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
    filter(({ fetchStatus }) => [FetchStatus.COMPLETE, FetchStatus.ERROR].includes(fetchStatus)),
    map((documentsValue) => {
      return getUnifiedHistogramPropsForTextBased({
        documentsValue,
        savedSearch: stateContainer.savedSearchState.getState(),
      });
    })
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
    map((state) => state.currentSuggestionContext),
    distinctUntilChanged(isEqual)
  );
};

function getUnifiedHistogramPropsForTextBased({
  documentsValue,
  savedSearch,
}: {
  documentsValue: DataDocumentsMsg | undefined;
  savedSearch: SavedSearch;
}) {
  const columns = documentsValue?.textBasedQueryColumns || EMPTY_TEXT_BASED_COLUMNS;

  const nextProps = {
    dataView: savedSearch.searchSource.getField('index')!,
    query: savedSearch.searchSource.getField('query'),
    columns,
  };

  addLog('[UnifiedHistogram] delayed next props for text-based', nextProps);

  return nextProps;
}
