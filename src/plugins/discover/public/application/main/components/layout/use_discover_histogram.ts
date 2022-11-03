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
import type { UnifiedHistogramFetchStatus } from '@kbn/unified-histogram-plugin/public';
import useDebounce from 'react-use/lib/useDebounce';
import type { UnifiedHistogramChartLoadEvent } from '@kbn/unified-histogram-plugin/public';
import { getUiActions } from '../../../../kibana_services';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDataState } from '../../hooks/use_data_state';
import type { SavedSearchData } from '../../hooks/use_saved_search';
import type { AppState, GetStateReturn } from '../../services/discover_state';
import { FetchStatus } from '../../../types';
import type { DiscoverSearchSessionManager } from '../../services/discover_search_session';
import type { InspectorAdapters } from '../../hooks/use_inspector';

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
  const { storage } = useDiscoverServices();

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
      dataView
    );
  }, [dataView, savedSearch.columns, timeField]);

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
   * Other callbacks
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

  const [lastReloadRequestTime, setLastReloadRequestTime] = useState(0);
  const { fetchStatus: mainFetchStatus } = useDataState(savedSearchData$.main$);

  // Reload unified histogram when a refetch is triggered,
  // with a debounce to avoid multiple requests
  const [, cancelDebounce] = useDebounce(
    () => {
      if (mainFetchStatus === FetchStatus.LOADING) {
        setLastReloadRequestTime(Date.now());
      }
    },
    100,
    [mainFetchStatus]
  );

  // A refetch is triggered when the data view is changed,
  // but we don't want to reload unified histogram in this case,
  // so cancel the debounced effect on unmount
  useEffect(() => cancelDebounce, [cancelDebounce]);

  const searchSessionId = searchSessionManager.getLastSearchSessionId();
  const request = useMemo(
    () => ({
      searchSessionId,
      adapter: inspectorAdapters.requests,
      lastReloadRequestTime,
    }),
    [inspectorAdapters.requests, lastReloadRequestTime, searchSessionId]
  );

  /**
   * Total hits
   */

  const onTotalHitsChange = useCallback(
    (status: UnifiedHistogramFetchStatus, totalHits?: number) => {
      const { fetchStatus, recordRawType } = savedSearchData$.totalHits$.getValue();

      if (fetchStatus === 'partial' && status === 'loading') {
        return;
      }

      savedSearchData$.totalHits$.next({
        fetchStatus: status as FetchStatus,
        result: totalHits,
        recordRawType,
      });
    },
    [savedSearchData$.totalHits$]
  );

  const { fetchStatus: hitsFetchStatus, result: hitsTotal } = useDataState(
    savedSearchData$.totalHits$
  );

  const hits = useMemo(
    () =>
      isPlainRecord
        ? undefined
        : {
            status: hitsFetchStatus,
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

  const chart = useMemo(
    () =>
      isPlainRecord || !isTimeBased
        ? undefined
        : {
            hidden: state.hideChart,
            timeInterval: state.interval,
          },
    [isPlainRecord, isTimeBased, state.hideChart, state.interval]
  );

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
    () => (isPlainRecord || !isTimeBased || !field ? undefined : { field }),
    [field, isPlainRecord, isTimeBased]
  );

  return {
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
  };
};
