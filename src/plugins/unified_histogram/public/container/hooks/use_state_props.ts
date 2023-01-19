/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataViewField, DataViewType } from '@kbn/data-views-plugin/common';
import { getAggregateQueryMode, isOfAggregateQueryType } from '@kbn/es-query';
import type { UnifiedHistogramChartLoadEvent, UnifiedHistogramFetchStatus } from '../../types';
import { useCallback, useEffect, useMemo } from 'react';
import type {
  UnifiedHistogramState,
  UnifiedHistogramStateService,
} from '../services/state_service';

export const useStateProps = ({
  state,
  stateService,
}: {
  state: UnifiedHistogramState | undefined;
  stateService: UnifiedHistogramStateService | undefined;
}) => {
  /**
   * Contexts
   */

  const isPlainRecord = useMemo(() => {
    return (
      state?.query &&
      isOfAggregateQueryType(state.query) &&
      getAggregateQueryMode(state.query) === 'sql'
    );
  }, [state?.query]);

  const isTimeBased = useMemo(() => {
    return (
      state?.dataView && state.dataView.type !== DataViewType.ROLLUP && state.dataView.isTimeBased()
    );
  }, [state?.dataView]);

  const hits = useMemo(() => {
    if (!state || isPlainRecord || state.totalHitsResult instanceof Error) {
      return undefined;
    }

    return {
      status: state.totalHitsStatus,
      total: state.totalHitsResult,
    };
  }, [isPlainRecord, state]);

  const chart = useMemo(() => {
    if (!state || isPlainRecord || !isTimeBased) {
      return undefined;
    }

    return {
      hidden: state.chartHidden,
      timeInterval: state.timeInterval,
    };
  }, [isPlainRecord, isTimeBased, state]);

  const breakdown = useMemo(() => {
    if (!state || isPlainRecord || !isTimeBased) {
      return undefined;
    }

    return { field: state.breakdownField };
  }, [isPlainRecord, isTimeBased, state]);

  const request = useMemo(() => {
    if (!state) {
      return undefined;
    }

    return {
      searchSessionId: state.searchSessionId,
      adapter: state.requestAdapter,
    };
  }, [state]);

  /**
   * Callbacks
   */

  const onTopPanelHeightChange = useCallback(
    (topPanelHeight: number | undefined) => {
      stateService?.updateState({ topPanelHeight });
    },
    [stateService]
  );

  const onTimeIntervalChange = useCallback(
    (timeInterval: string) => {
      stateService?.updateState({ timeInterval });
    },
    [stateService]
  );

  const onTotalHitsChange = useCallback(
    (totalHitsStatus: UnifiedHistogramFetchStatus, totalHitsResult?: number | Error) => {
      stateService?.updateState({ totalHitsStatus, totalHitsResult });
    },
    [stateService]
  );

  const onChartHiddenChange = useCallback(
    (chartHidden: boolean) => {
      stateService?.updateState({ chartHidden });
    },
    [stateService]
  );

  const onChartLoad = useCallback(
    (event: UnifiedHistogramChartLoadEvent) => {
      // We need to store the Lens request adapter in order to inspect its requests
      stateService?.updateState({ lensRequestAdapter: event.adapters.requests });
    },
    [stateService]
  );

  const onBreakdownFieldChange = useCallback(
    (breakdownField: DataViewField | undefined) => {
      stateService?.updateState({ breakdownField });
    },
    [stateService]
  );

  /**
   * Effects
   */

  // Clear the Lens request adapter when the chart is hidden
  useEffect(() => {
    if (state?.chartHidden || !chart) {
      stateService?.updateState({ lensRequestAdapter: undefined });
    }
  }, [chart, state?.chartHidden, stateService]);

  return {
    hits,
    chart,
    breakdown,
    request,
    onTopPanelHeightChange,
    onTimeIntervalChange,
    onTotalHitsChange,
    onChartHiddenChange,
    onChartLoad,
    onBreakdownFieldChange,
  };
};
