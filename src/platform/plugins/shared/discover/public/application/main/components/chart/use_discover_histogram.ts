/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UnifiedHistogramApi,
  UnifiedHistogramState,
  UnifiedHistogramVisContext,
  UseUnifiedHistogramProps,
} from '@kbn/unified-histogram';
import {
  canImportVisContext,
  UnifiedHistogramExternalVisContextStatus,
  UnifiedHistogramFetchStatus,
  type UnifiedHistogramFetchParamsExternal,
} from '@kbn/unified-histogram';
import { isEqual } from 'lodash';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, map, pairwise, startWith } from 'rxjs';
import useLatest from 'react-use/lib/useLatest';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import type { Filter } from '@kbn/es-query';
import { ESQL_TABLE_TYPE } from '@kbn/data-plugin/common';
import { useProfileAccessor } from '../../../../context_awareness';
import { useDiscoverCustomization } from '../../../../customizations';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { type DiscoverLatestFetchDetails, FetchStatus } from '../../../types';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';
import type { DiscoverStateContainer } from '../../state_management/discover_state';
import {
  type DiscoverAppState,
  useAppStateSelector,
} from '../../state_management/discover_app_state_container';
import type { DataDocumentsMsg } from '../../state_management/discover_data_state_container';
import { useSavedSearch } from '../../state_management/discover_state_provider';
import { useIsEsqlMode } from '../../hooks/use_is_esql_mode';
import {
  type InitialUnifiedHistogramLayoutProps,
  internalStateActions,
  useCurrentDataView,
  useCurrentTabAction,
  useCurrentTabSelector,
  useInternalStateDispatch,
} from '../../state_management/redux';

const EMPTY_ESQL_COLUMNS: DatatableColumn[] = [];
const EMPTY_FILTERS: Filter[] = [];

export interface UseUnifiedHistogramOptions {
  initialLayoutProps?: InitialUnifiedHistogramLayoutProps;
}

export const useDiscoverHistogram = (
  stateContainer: DiscoverStateContainer,
  options?: UseUnifiedHistogramOptions
): UseUnifiedHistogramProps & { setUnifiedHistogramApi: (api: UnifiedHistogramApi) => void } => {
  const services = useDiscoverServices();
  const {
    data$: { main$, documents$, totalHits$ },
    inspectorAdapters,
    getAbortController,
  } = stateContainer.dataState;
  const savedSearchState = useSavedSearch();
  const isEsqlMode = useIsEsqlMode();

  /**
   * API initialization
   */

  const [unifiedHistogramApi, setUnifiedHistogramApi] = useState<UnifiedHistogramApi>();
  const [isSuggestionLoading, setIsSuggestionLoading] = useState(false);

  /**
   * Sync Unified Histogram state with Discover state
   */

  useEffect(() => {
    const subscription = createUnifiedHistogramStateObservable(
      unifiedHistogramApi?.state$
    )?.subscribe((changes) => {
      const { lensRequestAdapter, ...stateChanges } = changes;
      const appState = stateContainer.appState.getState();
      const oldState = {
        hideChart: appState.hideChart,
        interval: appState.interval,
      };
      const newState = { ...oldState, ...stateChanges };

      if ('lensRequestAdapter' in changes) {
        inspectorAdapters.lensRequests = lensRequestAdapter;
      }

      if (!isEqual(oldState, newState)) {
        stateContainer.appState.update(newState);
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [inspectorAdapters, stateContainer.appState, unifiedHistogramApi?.state$]);

  /**
   * Sync URL query params with Unified Histogram
   */

  useEffect(() => {
    const subscription = createAppStateObservable(stateContainer.appState.state$).subscribe(
      (changes) => {
        if ('timeInterval' in changes && changes.timeInterval) {
          unifiedHistogramApi?.setTimeInterval(changes.timeInterval);
        }

        if ('chartHidden' in changes && typeof changes.chartHidden === 'boolean') {
          unifiedHistogramApi?.setChartHidden(changes.chartHidden);
        }
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [stateContainer.appState.state$, unifiedHistogramApi]);

  /**
   * Total hits
   */

  const setTotalHitsError = useMemo(() => sendErrorTo(totalHits$), [totalHits$]);

  useEffect(() => {
    const subscription = createTotalHitsObservable(unifiedHistogramApi?.state$)?.subscribe(
      ({ status, result }) => {
        if (isEsqlMode) {
          // ignore histogram's total hits updates for ES|QL as Discover manages them during docs fetching
          return;
        }

        if (result instanceof Error) {
          // Set totalHits$ to an error state
          setTotalHitsError(result);
          return;
        }

        const { result: totalHitsResult } = totalHits$.getValue();

        if (
          (status === UnifiedHistogramFetchStatus.loading ||
            status === UnifiedHistogramFetchStatus.uninitialized) &&
          totalHitsResult &&
          typeof result !== 'number'
        ) {
          // ignore the histogram initial loading state if discover state already has a total hits value
          return;
        }

        const fetchStatus = status.toString() as FetchStatus;

        // Do not sync the loading state since it's already handled by fetchAll
        if (fetchStatus !== FetchStatus.LOADING) {
          totalHits$.next({
            fetchStatus,
            result,
          });
        }

        if (status !== UnifiedHistogramFetchStatus.complete || typeof result !== 'number') {
          return;
        }

        // Check the hits count to set a partial or no results state
        checkHitCount(main$, result);
      }
    );

    return () => {
      subscription?.unsubscribe();
    };
  }, [
    isEsqlMode,
    main$,
    totalHits$,
    setTotalHitsError,
    stateContainer.appState,
    unifiedHistogramApi?.state$,
  ]);

  useEffect(() => {
    if (!isEsqlMode) {
      setIsSuggestionLoading(false);
      return;
    }

    const documentsLoading = documents$.subscribe((state) => {
      if (state.fetchStatus === FetchStatus.LOADING) {
        setIsSuggestionLoading(true);
      } else {
        setIsSuggestionLoading(false);
      }
    });

    return () => {
      documentsLoading.unsubscribe();
    };
  }, [isEsqlMode, documents$]);

  /**
   * Request params
   */
  const requestParams = useCurrentTabSelector((state) => state.dataRequestParams);
  const currentTabControlState = useCurrentTabSelector((tab) => tab.controlGroupState);
  const {
    timeRangeRelative: relativeTimeRange,
    timeRangeAbsolute: timeRange,
    searchSessionId,
  } = requestParams;

  const dataView = useCurrentDataView();

  const histogramCustomization = useDiscoverCustomization('unified_histogram');

  const query = useAppStateSelector((state) => state.query);
  const appFilters = useAppStateSelector((state) => state.filters);
  const { filters: globalFilters } = useCurrentTabSelector((state) => state.globalState);

  const filtersMemoized = useMemo(() => {
    const allFilters = [...(globalFilters ?? []), ...(appFilters ?? [])];
    return allFilters.length ? allFilters : EMPTY_FILTERS;
  }, [appFilters, globalFilters]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const timeRangeMemoized = useMemo(() => timeRange, [timeRange?.from, timeRange?.to]);

  const chartHidden = useAppStateSelector((state) => state.hideChart);
  const timeInterval = useAppStateSelector((state) => state.interval);
  const breakdownField = useAppStateSelector((state) => state.breakdownField);
  const esqlVariables = useCurrentTabSelector((tab) => tab.esqlVariables);

  const collectedFetchParams: UnifiedHistogramFetchParamsExternal | undefined = useMemo(() => {
    return {
      searchSessionId,
      requestAdapter: inspectorAdapters.requests,
      dataView,
      query,
      filters: isEsqlMode ? EMPTY_FILTERS : filtersMemoized,
      timeRange: timeRangeMemoized,
      relativeTimeRange,
      breakdownField,
      esqlVariables,
      controlsState: currentTabControlState,
      // visContext should be in sync with current query
      externalVisContext:
        isEsqlMode && canImportVisContext(savedSearchState?.visContext)
          ? savedSearchState?.visContext
          : undefined,
    };
  }, [
    breakdownField,
    currentTabControlState,
    dataView,
    esqlVariables,
    filtersMemoized,
    inspectorAdapters.requests,
    isEsqlMode,
    relativeTimeRange,
    searchSessionId,
    timeRangeMemoized,
    query,
    savedSearchState?.visContext,
  ]);

  const usedFetchParamsRef = useRef<UnifiedHistogramFetchParamsExternal | null>(null);

  const triggerUnifiedHistogramFetch = useLatest(
    (latestFetchDetails: DiscoverLatestFetchDetails | undefined) => {
      const visContext = latestFetchDetails?.visContext ?? savedSearchState?.visContext;
      const { table, esqlQueryColumns } = getUnifiedHistogramTableForEsql({
        documentsValue: documents$.getValue(),
        isEsqlMode,
      });

      const nextFetchParams = {
        ...collectedFetchParams,
        abortController: latestFetchDetails?.abortController ?? getAbortController(),
        columns: isEsqlMode ? esqlQueryColumns : undefined,
        table: isEsqlMode ? table : undefined,
        externalVisContext: isEsqlMode && canImportVisContext(visContext) ? visContext : undefined,
      };
      usedFetchParamsRef.current = nextFetchParams;
      unifiedHistogramApi?.fetch(nextFetchParams);
    }
  );

  /**
   * Data fetching
   */
  useEffect(() => {
    if (!unifiedHistogramApi) {
      return;
    }

    const subscription = stateContainer.dataState.fetchChart$.subscribe((latestFetchDetails) => {
      console.debug('Use Unified Histogram - Fetch triggered');
      triggerUnifiedHistogramFetch.current(latestFetchDetails);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [stateContainer.dataState.fetchChart$, triggerUnifiedHistogramFetch, unifiedHistogramApi]);

  useEffect(() => {
    const usedFetchParams = usedFetchParamsRef.current;
    if (!collectedFetchParams || !usedFetchParams) {
      return;
    }
    console.log('Use Unified Histogram - comparing fetch params');
    const changedParams = Object.keys(collectedFetchParams).filter((key) => {
      return (
        collectedFetchParams[key as keyof UnifiedHistogramFetchParamsExternal] !==
        usedFetchParams[key as keyof UnifiedHistogramFetchParamsExternal]
      );
    });

    if (changedParams.length === 1 && changedParams[0] === 'externalVisContext') {
      console.log('Use Unified Histogram - externalVisContext changed, triggering fetch');
      triggerUnifiedHistogramFetch.current({
        visContext: collectedFetchParams.externalVisContext,
      });
    }
  }, [collectedFetchParams, triggerUnifiedHistogramFetch]);

  const setOverriddenVisContextAfterInvalidation = useCurrentTabAction(
    internalStateActions.setOverriddenVisContextAfterInvalidation
  );
  const dispatch = useInternalStateDispatch();

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
          dispatch(
            setOverriddenVisContextAfterInvalidation({
              overriddenVisContextAfterInvalidation: undefined,
            })
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.automaticallyOverridden:
          // if the visualization was invalidated as incompatible and rebuilt
          // (it will be used later for saving the visualization via Save button)
          dispatch(
            setOverriddenVisContextAfterInvalidation({
              overriddenVisContextAfterInvalidation: nextVisContext,
            })
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.automaticallyCreated:
        case UnifiedHistogramExternalVisContextStatus.applied:
          // clearing the value in the internal state so we don't use it during saved search saving
          dispatch(
            setOverriddenVisContextAfterInvalidation({
              overriddenVisContextAfterInvalidation: undefined,
            })
          );
          break;
        case UnifiedHistogramExternalVisContextStatus.unknown:
          // using `{}` to overwrite the value inside the saved search SO during saving
          dispatch(
            setOverriddenVisContextAfterInvalidation({
              overriddenVisContextAfterInvalidation: {},
            })
          );
          break;
      }
    },
    [dispatch, setOverriddenVisContextAfterInvalidation, stateContainer.savedSearchState]
  );

  const onBreakdownFieldChange = useCallback<
    NonNullable<UseUnifiedHistogramProps['onBreakdownFieldChange']>
  >(
    (nextBreakdownField) => {
      if (nextBreakdownField !== breakdownField) {
        stateContainer.appState.update({ breakdownField: nextBreakdownField });
      }
    },
    [breakdownField, stateContainer.appState]
  );

  const getModifiedVisAttributesAccessor = useProfileAccessor('getModifiedVisAttributes');
  const getModifiedVisAttributes = useCallback<
    NonNullable<UseUnifiedHistogramProps['getModifiedVisAttributes']>
  >(
    (attributes) => getModifiedVisAttributesAccessor((params) => params.attributes)({ attributes }),
    [getModifiedVisAttributesAccessor]
  );

  return {
    setUnifiedHistogramApi,
    services,
    localStorageKeyPrefix: 'discover',
    initialState: {
      chartHidden,
      timeInterval,
      topPanelHeight: options?.initialLayoutProps?.topPanelHeight,
      totalHitsStatus: UnifiedHistogramFetchStatus.loading,
      totalHitsResult: undefined,
    },
    onFilter: histogramCustomization?.onFilter,
    onBrushEnd: histogramCustomization?.onBrushEnd,
    withDefaultActions: histogramCustomization?.withDefaultActions,
    disabledActions: histogramCustomization?.disabledActions,
    isChartLoading: isSuggestionLoading,
    onVisContextChanged: isEsqlMode ? onVisContextChanged : undefined,
    onBreakdownFieldChange,
    getModifiedVisAttributes, // TODO: should it be a part of fetch params?
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

const createTotalHitsObservable = (state$?: Observable<UnifiedHistogramState>) => {
  return state$?.pipe(
    map((state) => ({ status: state.totalHitsStatus, result: state.totalHitsResult })),
    distinctUntilChanged((prev, curr) => prev.status === curr.status && prev.result === curr.result)
  );
};

function getUnifiedHistogramTableForEsql({
  documentsValue,
  isEsqlMode,
}: {
  documentsValue: DataDocumentsMsg | undefined;
  isEsqlMode: boolean;
}) {
  if (
    !isEsqlMode ||
    !documentsValue?.result ||
    ![FetchStatus.COMPLETE, FetchStatus.ERROR].includes(documentsValue.fetchStatus)
  ) {
    return {
      table: undefined,
      esqlQueryColumns: EMPTY_ESQL_COLUMNS,
    };
  }

  const esqlQueryColumns = documentsValue?.esqlQueryColumns || EMPTY_ESQL_COLUMNS;
  return {
    table: {
      type: 'datatable' as const,
      rows: documentsValue.result.map((r) => r.raw),
      columns: esqlQueryColumns,
      meta: { type: ESQL_TABLE_TYPE },
    },
    esqlQueryColumns,
  };
}
