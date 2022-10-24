/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import {
  getVisualizeInformation,
  triggerVisualizeActions,
} from '@kbn/unified-field-list-plugin/public';
import { buildChartData } from '@kbn/unified-histogram-plugin/public';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { DiscoverStateContainer } from '../../services/discover_state';
import { SavedSearchData } from '../../services/discover_data_state_container';
import { getUiActions } from '../../../../kibana_services';
import { PLUGIN_ID } from '../../../../../common';
import { useDiscoverServices } from '../../../../hooks/use_discover_services';
import { useDataState } from '../../hooks/use_data_state';
import { useAppStateSelector } from '../../services/discover_app_state_container';

export const CHART_HIDDEN_KEY = 'discover:chartHidden';
export const HISTOGRAM_HEIGHT_KEY = 'discover:histogramHeight';

export const useDiscoverHistogram = ({
  stateContainer,
  savedSearchData$,
  dataView,
  savedSearch,
  isTimeBased,
  isPlainRecord,
}: {
  stateContainer: DiscoverStateContainer;
  savedSearchData$: SavedSearchData;
  dataView: DataView;
  savedSearch: SavedSearch;
  isTimeBased: boolean;
  isPlainRecord: boolean;
}) => {
  const { storage, data } = useDiscoverServices();
  const [hideChart, interval] = useAppStateSelector((state) => [state.hideChart, state.interval]);

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
        timeInterval: interval,
        response,
      }),
    [data, dataView, response, interval]
  );

  const chart = useMemo(
    () =>
      isPlainRecord || !isTimeBased
        ? undefined
        : {
            status: chartFetchStatus,
            hidden: hideChart,
            timeInterval: interval,
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
      hideChart,
      interval,
    ]
  );

  return {
    topPanelHeight,
    hits,
    chart,
    onEditVisualization: canVisualize ? onEditVisualization : undefined,
    onTopPanelHeightChange,
    onChartHiddenChange,
    onTimeIntervalChange,
  };
};
