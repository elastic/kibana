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
import { buildChartData } from '@kbn/unified-histogram-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { getUiActions } from '../../../../kibana_services';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDataState } from '../../hooks/use_data_state';
import type { SavedSearchData } from '../../hooks/use_saved_search';
import type { AppState, GetStateReturn } from '../../services/discover_state';

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
}: {
  stateContainer: GetStateReturn;
  state: AppState;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  savedSearch: SavedSearch;
  isTimeBased: boolean;
  isPlainRecord: boolean;
}) => {
  const { storage, data } = useDiscoverServices();

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

  const onChartHiddenChange = useCallback(
    (chartHidden: boolean) => {
      storage.set(CHART_HIDDEN_KEY, chartHidden);
      stateContainer.setAppState({ hideChart: chartHidden });
    },
    [stateContainer, storage]
  );

  const onTimeIntervalChange = useCallback(
    (newInterval: string) => {
      stateContainer.setAppState({ interval: newInterval });
    },
    [stateContainer]
  );

  /**
   * Data
   */

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

  const { fetchStatus: chartFetchStatus, response, error } = useDataState(savedSearchData$.charts$);

  const { bucketInterval, chartData } = useMemo(
    () =>
      buildChartData({
        data,
        dataView,
        timeInterval: state.interval,
        response,
      }),
    [data, dataView, response, state.interval]
  );

  const chart = useMemo(
    () =>
      isPlainRecord || !isTimeBased
        ? undefined
        : {
            status: chartFetchStatus,
            hidden: state.hideChart,
            timeInterval: state.interval,
            bucketInterval,
            data: chartData,
            error,
          },
    [
      bucketInterval,
      chartData,
      chartFetchStatus,
      error,
      isPlainRecord,
      isTimeBased,
      state.hideChart,
      state.interval,
    ]
  );

  /**
   * Breakdown
   */

  const [field, setField] = useState(() => {
    const fieldName = storage.get(HISTOGRAM_BREAKDOWN_FIELD_KEY);
    return dataView.getFieldByName(fieldName);
  });

  const onBreakdownFieldChange = useCallback(
    (breakdownField: DataViewField | undefined) => {
      storage.set(HISTOGRAM_BREAKDOWN_FIELD_KEY, breakdownField?.name);
      setField(breakdownField);
    },
    [storage]
  );

  const breakdown = useMemo(
    () => (isPlainRecord || !isTimeBased ? undefined : { field }),
    [field, isPlainRecord, isTimeBased]
  );

  return {
    topPanelHeight,
    hits,
    chart,
    breakdown,
    onEditVisualization: canVisualize ? onEditVisualization : undefined,
    onTopPanelHeightChange,
    onChartHiddenChange,
    onTimeIntervalChange,
    onBreakdownFieldChange,
  };
};
