/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataViewField } from '@kbn/data-views-plugin/common';
import { useCallback, useEffect, useMemo } from 'react';
import type {
  UnifiedHistogramChartLoadEvent,
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetchStatus,
  UnifiedHistogramServices,
  UnifiedHistogramTopPanelHeightContext,
} from '../types';
import type { UnifiedHistogramStateService } from '../services/state_service';
import {
  chartHiddenSelector,
  totalHitsResultSelector,
  totalHitsStatusSelector,
  lensAdaptersSelector,
  lensDataLoadingSelector$,
  topPanelHeightSelector,
} from '../utils/state_selectors';
import { useStateSelector } from './use_state_selector';
import { setBreakdownField } from '../utils/local_storage_utils';

export const useStateProps = ({
  services,
  localStorageKeyPrefix,
  stateService,
  fetchParams,
  onBreakdownFieldChange: originalOnBreakdownFieldChange,
  onTimeIntervalChange: originalOnTimeIntervalChange,
}: {
  services: UnifiedHistogramServices;
  localStorageKeyPrefix: string | undefined;
  stateService: UnifiedHistogramStateService | undefined;
  fetchParams: UnifiedHistogramFetchParams | undefined;
  onBreakdownFieldChange: ((breakdownField: string | undefined) => void) | undefined;
  onTimeIntervalChange: ((timeInterval: string | undefined) => void) | undefined;
}) => {
  const topPanelHeight = useStateSelector(stateService?.state$, topPanelHeightSelector);
  const chartHidden = useStateSelector(stateService?.state$, chartHiddenSelector);
  const totalHitsResult = useStateSelector(stateService?.state$, totalHitsResultSelector);
  const totalHitsStatus = useStateSelector(stateService?.state$, totalHitsStatusSelector);
  const lensAdapters = useStateSelector(stateService?.state$, lensAdaptersSelector);
  const lensDataLoading$ = useStateSelector(stateService?.state$, lensDataLoadingSelector$);

  const { breakdown, isTimeBased, isESQLQuery, timeInterval } = fetchParams || {};

  const hits = useMemo(() => {
    if (totalHitsResult instanceof Error) {
      return undefined;
    }

    return {
      status: totalHitsStatus,
      total: totalHitsResult,
    };
  }, [totalHitsResult, totalHitsStatus]);

  const chart = useMemo(() => {
    if (!isTimeBased && !isESQLQuery) {
      return undefined;
    }

    return {
      hidden: chartHidden,
      timeInterval,
    };
  }, [chartHidden, isESQLQuery, isTimeBased, timeInterval]);

  /**
   * Callbacks
   */

  const onTopPanelHeightChange = useCallback(
    (newTopPanelHeight: UnifiedHistogramTopPanelHeightContext) => {
      stateService?.setTopPanelHeight(newTopPanelHeight);
    },
    [stateService]
  );

  const onTotalHitsChange = useCallback(
    (newTotalHitsStatus: UnifiedHistogramFetchStatus, newTotalHitsResult?: number | Error) => {
      stateService?.setTotalHits({
        totalHitsStatus: newTotalHitsStatus,
        totalHitsResult: newTotalHitsResult,
      });
    },
    [stateService]
  );

  const onChartHiddenChange = useCallback(
    (newChartHidden: boolean) => {
      stateService?.setChartHidden(newChartHidden);
    },
    [stateService]
  );

  const onChartLoad = useCallback(
    (event: UnifiedHistogramChartLoadEvent) => {
      // We need to store the Lens request adapter in order to inspect its requests
      stateService?.setLensRequestAdapter(event.adapters.requests);
      stateService?.setLensAdapters(event.adapters);
      stateService?.setLensDataLoading$(event.dataLoading$);
    },
    [stateService]
  );

  const onBreakdownFieldChange = useCallback(
    (newBreakdownField: DataViewField | undefined) => {
      originalOnBreakdownFieldChange?.(newBreakdownField?.name);
    },
    [originalOnBreakdownFieldChange]
  );

  const onTimeIntervalChange = useCallback(
    (nextTimeInterval: string | undefined) => {
      originalOnTimeIntervalChange?.(nextTimeInterval);
    },
    [originalOnTimeIntervalChange]
  );

  /**
   * Effects
   */

  const breakdownField = breakdown?.field?.name ?? '';
  // Sync the breakdown field with local storage
  useEffect(() => {
    if (localStorageKeyPrefix) {
      setBreakdownField(services.storage, localStorageKeyPrefix, breakdownField);
    }
  }, [breakdownField, localStorageKeyPrefix, services.storage]);

  // Clear the Lens request adapter when the chart is hidden
  useEffect(() => {
    if (chartHidden || !chart) {
      stateService?.setLensRequestAdapter(undefined);
    }
  }, [chart, chartHidden, stateService]);

  return {
    topPanelHeight,
    hits,
    chart,
    lensAdapters,
    dataLoading$: lensDataLoading$,
    onTopPanelHeightChange,
    onTimeIntervalChange,
    onTotalHitsChange,
    onChartHiddenChange,
    onChartLoad,
    onBreakdownFieldChange,
  };
};
