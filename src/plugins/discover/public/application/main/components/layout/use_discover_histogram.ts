/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  getVisualizeInformation,
  triggerVisualizeActions,
} from '@kbn/unified-field-list-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { UnifiedHistogramFetchStatus } from '@kbn/unified-histogram-plugin/public';
import type { UnifiedHistogramChartLoadEvent } from '@kbn/unified-histogram-plugin/public';
import useObservable from 'react-use/lib/useObservable';
import { getUiActions } from '../../../../kibana_services';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDataState } from '../../hooks/use_data_state';
import type { SavedSearchData } from '../../hooks/use_saved_search';
import type { AppState, GetStateReturn } from '../../services/discover_state';
import { FetchStatus } from '../../../types';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';
import { sendErrorTo } from '../../utils/fetch_all';

export const CHART_HIDDEN_KEY = 'discover:chartHidden';
export const HISTOGRAM_HEIGHT_KEY = 'discover:histogramHeight';
export const HISTOGRAM_BREAKDOWN_FIELD_KEY = 'discover:histogramBreakdownField';

export const useDiscoverHistogram = ({
  stateContainer,
  state,
  savedSearchData$,
  dataView,
  savedSearch,
  isTimeBased,
  isPlainRecord,
  inspectorAdapters,
  searchSessionManager,
}: {
  stateContainer: GetStateReturn;
  state: AppState;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  savedSearch: SavedSearch;
  isTimeBased: boolean;
  isPlainRecord: boolean;
  inspectorAdapters: InspectorAdapters;
  searchSessionManager: DiscoverSearchSessionManager;
}) => {
  const { storage, data } = useDiscoverServices();

  /**
   * Breakdown
   */

  const onBreakdownFieldChange = useCallback(
    (breakdownField: DataViewField | undefined) => {
      stateContainer.setAppState({ breakdownField: breakdownField?.name });
    },
    [stateContainer]
  );

  const field = useMemo(
    () => (state.breakdownField ? dataView.getFieldByName(state.breakdownField) : undefined),
    [dataView, state.breakdownField]
  );

  const breakdown = useMemo(
    () => (isPlainRecord || !isTimeBased ? undefined : { field }),
    [field, isPlainRecord, isTimeBased]
  );

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

  const onEditVisualization = useCallback(() => {
    if (!timeField) {
      return;
    }
    triggerVisualizeActions(
      getUiActions(),
      timeField,
      savedSearch.columns || [],
      PLUGIN_ID,
      dataView,
      breakdown?.field
    );
  }, [breakdown?.field, dataView, savedSearch.columns, timeField]);

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
   * Request
   */

  // The searchSessionId will be updated whenever a new search
  // is started and will trigger a unified histogram refetch
  const searchSessionId = useObservable(searchSessionManager.searchSessionId$);
  const request = useMemo(
    () => ({
      searchSessionId,
      adapter: inspectorAdapters.requests,
    }),
    [inspectorAdapters.requests, searchSessionId]
  );

  /**
   * Total hits
   */

  const sendTotalHitsError = useMemo(
    () => sendErrorTo(data, savedSearchData$.totalHits$),
    [data, savedSearchData$.totalHits$]
  );

  const onTotalHitsChange = useCallback(
    (status: UnifiedHistogramFetchStatus, result?: number | Error) => {
      if (result instanceof Error) {
        sendTotalHitsError(result);
        return;
      }

      const { fetchStatus, recordRawType } = savedSearchData$.totalHits$.getValue();

      // If we have a partial result already, we don't
      // want to update the total hits back to loading
      if (fetchStatus === FetchStatus.PARTIAL && status === UnifiedHistogramFetchStatus.loading) {
        return;
      }

      savedSearchData$.totalHits$.next({
        fetchStatus: status.toString() as FetchStatus,
        result,
        recordRawType,
      });
    },
    [savedSearchData$.totalHits$, sendTotalHitsError]
  );

  const { fetchStatus: hitsFetchStatus, result: hitsTotal } = useDataState(
    savedSearchData$.totalHits$
  );

  const hits = useMemo(
    () =>
      isPlainRecord
        ? undefined
        : {
            status: hitsFetchStatus.toString() as UnifiedHistogramFetchStatus,
            total: hitsTotal,
          },
    [hitsFetchStatus, hitsTotal, isPlainRecord]
  );

  /**
   * Chart
   */

  const onChartHiddenChange = useCallback(
    (chartHidden: boolean) => {
      // Clear the Lens request adapter when the chart is hidden
      if (chartHidden) {
        inspectorAdapters.lensRequests = undefined;
      }

      storage.set(CHART_HIDDEN_KEY, chartHidden);
      stateContainer.setAppState({ hideChart: chartHidden });
    },
    [inspectorAdapters, stateContainer, storage]
  );

  const onChartLoad = useCallback(
    (event: UnifiedHistogramChartLoadEvent) => {
      // We need to store the Lens request adapter in order to inspect its requests
      inspectorAdapters.lensRequests = event.adapters.requests;
    },
    [inspectorAdapters]
  );

  const [chartHidden, setChartHidden] = useState(state.hideChart);
  const chart = useMemo(
    () =>
      isPlainRecord || !isTimeBased
        ? undefined
        : {
            hidden: chartHidden,
            timeInterval: state.interval,
          },
    [chartHidden, isPlainRecord, isTimeBased, state.interval]
  );

  // state.chartHidden is updated before searchSessionId, which can trigger duplicate
  // requests, so instead of using state.chartHidden directly, we update chartHidden
  // when searchSessionId changes
  useEffect(() => {
    setChartHidden(state.hideChart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchSessionId]);

  return searchSessionId
    ? {
        topPanelHeight,
        request,
        hits,
        chart,
        breakdown,
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
