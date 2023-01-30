/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import { getVisualizeInformation, useQuerySubscriber } from '@kbn/unified-field-list-plugin/public';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  UnifiedHistogramFetchStatus,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInputMessage,
} from '@kbn/unified-histogram-plugin/public';
import type { UnifiedHistogramChartLoadEvent } from '@kbn/unified-histogram-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import { Subject } from 'rxjs';
import { useAppStateSelector } from '../../services/discover_app_state_container';
import { getUiActions } from '../../../../kibana_services';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDataState } from '../../hooks/use_data_state';
import type { DataFetch$, SavedSearchData } from '../../services/discover_data_state_container';
import type { DiscoverStateContainer } from '../../services/discover_state';
import { FetchStatus } from '../../../types';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { checkHitCount, sendErrorTo } from '../../hooks/use_saved_search_messages';

export const CHART_HIDDEN_KEY = 'discover:chartHidden';
export const HISTOGRAM_HEIGHT_KEY = 'discover:histogramHeight';
export const HISTOGRAM_BREAKDOWN_FIELD_KEY = 'discover:histogramBreakdownField';

export interface UseDiscoverHistogramProps {
  stateContainer: DiscoverStateContainer;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  savedSearch: SavedSearch;
  isTimeBased: boolean;
  isPlainRecord: boolean;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
  savedSearchFetch$: DataFetch$;
}

export const useDiscoverHistogram = ({
  stateContainer,
  savedSearchData$,
  dataView,
  savedSearch,
  isTimeBased,
  isPlainRecord,
  inspectorAdapters,
  searchSessionManager,
  savedSearchFetch$,
}: UseDiscoverHistogramProps) => {
  const { storage, data, lens } = useDiscoverServices();
  const [hideChart, interval, breakdownField] = useAppStateSelector((state) => [
    state.hideChart,
    state.interval,
    state.breakdownField,
  ]);

  /**
   * Visualize
   */

  const timeField = dataView.timeFieldName && dataView.getFieldByName(dataView.timeFieldName);
  const [canVisualize, setCanVisualize] = useState(false);

  useEffect(() => {
    if (!timeField) {
      return;
    }
    getVisualizeInformation(
      getUiActions(),
      timeField,
      dataView,
      savedSearch.columns || [],
      []
    ).then((info) => {
      setCanVisualize(Boolean(info));
    });
  }, [dataView, savedSearch.columns, timeField]);

  const onEditVisualization = useCallback(
    (lensAttributes: TypedLensByValueInput['attributes']) => {
      if (!timeField) {
        return;
      }
      lens.navigateToPrefilledEditor({
        id: '',
        timeRange: data.query.timefilter.timefilter.getTime(),
        attributes: lensAttributes,
      });
    },
    [data.query.timefilter.timefilter, lens, timeField]
  );

  /**
   * Height
   */

  const [topPanelHeight, setTopPanelHeight] = useState(() => {
    const storedHeight = storage.get(HISTOGRAM_HEIGHT_KEY);
    return storedHeight ? Number(storedHeight) : undefined;
  });

  const onTopPanelHeightChange = useCallback(
    (newTopPanelHeight: number | undefined) => {
      storage.set(HISTOGRAM_HEIGHT_KEY, newTopPanelHeight);
      setTopPanelHeight(newTopPanelHeight);
    },
    [storage]
  );

  /**
   * Time interval
   */

  const onTimeIntervalChange = useCallback(
    (newInterval: string) => {
      stateContainer.setAppState({ interval: newInterval });
    },
    [stateContainer]
  );

  /**
   * Total hits
   */

  const [localHitsContext, setLocalHitsContext] = useState<UnifiedHistogramHitsContext>();

  const onTotalHitsChange = useCallback(
    (status: UnifiedHistogramFetchStatus, result?: number | Error) => {
      if (result instanceof Error) {
        // Display the error and set totalHits$ to an error state
        sendErrorTo(data, savedSearchData$.totalHits$)(result);
        return;
      }

      const { fetchStatus, recordRawType } = savedSearchData$.totalHits$.getValue();

      // If we have a partial result already, we don't want to update the total hits back to loading
      if (fetchStatus === FetchStatus.PARTIAL && status === UnifiedHistogramFetchStatus.loading) {
        return;
      }

      // Set a local copy of the hits context to pass to unified histogram
      setLocalHitsContext({ status, total: result });

      // Sync the totalHits$ observable with the unified histogram state
      savedSearchData$.totalHits$.next({
        fetchStatus: status.toString() as FetchStatus,
        result,
        recordRawType,
      });

      // Check the hits count to set a partial or no results state
      if (status === UnifiedHistogramFetchStatus.complete && typeof result === 'number') {
        checkHitCount(savedSearchData$.main$, result);
      }
    },
    [data, savedSearchData$.main$, savedSearchData$.totalHits$]
  );

  // We only rely on the totalHits$ observable if we don't have a local hits context yet,
  // since we only want to show the partial results on the first load, or there will be
  // a flickering effect as the loading spinner is quickly shown and hidden again on fetches
  const { fetchStatus: hitsFetchStatus, result: hitsTotal } = useDataState(
    savedSearchData$.totalHits$
  );

  const hits = useMemo(
    () =>
      isPlainRecord
        ? undefined
        : localHitsContext ?? {
            status: hitsFetchStatus.toString() as UnifiedHistogramFetchStatus,
            total: hitsTotal,
          },
    [hitsFetchStatus, hitsTotal, isPlainRecord, localHitsContext]
  );

  /**
   * Chart
   */

  const onChartHiddenChange = useCallback(
    (chartHidden: boolean) => {
      storage.set(CHART_HIDDEN_KEY, chartHidden);
      stateContainer.setAppState({ hideChart: chartHidden });
    },
    [stateContainer, storage]
  );

  const onChartLoad = useCallback(
    (event: UnifiedHistogramChartLoadEvent) => {
      // We need to store the Lens request adapter in order to inspect its requests
      inspectorAdapters.lensRequests = event.adapters.requests;
    },
    [inspectorAdapters]
  );

  const chart = useMemo(
    () =>
      isPlainRecord || !isTimeBased
        ? undefined
        : {
            hidden: hideChart,
            timeInterval: interval,
          },
    [hideChart, interval, isPlainRecord, isTimeBased]
  );

  // Clear the Lens request adapter when the chart is hidden
  useEffect(() => {
    if (hideChart || !chart) {
      inspectorAdapters.lensRequests = undefined;
    }
  }, [chart, hideChart, inspectorAdapters]);

  /**
   * Breakdown
   */

  const onBreakdownFieldChange = useCallback(
    (newBreakdownField: DataViewField | undefined) => {
      stateContainer.setAppState({ breakdownField: newBreakdownField?.name });
    },
    [stateContainer]
  );

  const field = useMemo(
    () => (breakdownField ? dataView.getFieldByName(breakdownField) : undefined),
    [dataView, breakdownField]
  );

  const breakdown = useMemo(
    () => (isPlainRecord || !isTimeBased ? undefined : { field }),
    [field, isPlainRecord, isTimeBased]
  );

  /**
   * Search params
   */

  const { query, filters, fromDate: from, toDate: to } = useQuerySubscriber({ data });
  const timeRange = useMemo(
    () => (from && to ? { from, to } : data.query.timefilter.timefilter.getTimeDefaults()),
    [data.query.timefilter.timefilter, from, to]
  );

  /**
   * Request
   */

  // The searchSessionId will be updated whenever a new search is started
  const searchSessionId = useObservable(searchSessionManager.searchSessionId$);
  const request = useMemo(
    () => ({
      searchSessionId,
      adapter: inspectorAdapters.requests,
    }),
    [inspectorAdapters.requests, searchSessionId]
  );

  /**
   * Data fetching
   */

  const input$ = useMemo(() => new Subject<UnifiedHistogramInputMessage>(), []);

  // Initialized when the first search has been requested or
  // when in SQL mode since search sessions are not supported
  const isInitialized = Boolean(searchSessionId) || isPlainRecord;
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
      if (isInitialized && !skipRefetch.current) {
        input$.next({ type: 'refetch' });
      }
      skipRefetch.current = false;
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [input$, isInitialized, savedSearchFetch$]);

  // Don't render the unified histogram layout until initialized
  return isInitialized
    ? {
        query,
        filters,
        timeRange,
        topPanelHeight,
        request,
        hits,
        chart,
        breakdown,
        disableAutoFetching: true,
        input$,
        onEditVisualization: canVisualize ? onEditVisualization : undefined,
        onTopPanelHeightChange,
        onChartHiddenChange,
        onTimeIntervalChange,
        onBreakdownFieldChange,
        onTotalHitsChange,
        onChartLoad,
      }
    : undefined;
};
