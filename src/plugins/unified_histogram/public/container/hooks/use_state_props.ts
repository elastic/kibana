/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/common';
import {
  AggregateQuery,
  getAggregateQueryMode,
  isOfAggregateQueryType,
  Query,
} from '@kbn/es-query';
import type { RequestAdapter } from '@kbn/inspector-plugin/public';
import { useCallback, useEffect, useMemo } from 'react';
import { UnifiedHistogramChartLoadEvent, UnifiedHistogramFetchStatus } from '../../types';
import type { UnifiedHistogramStateService } from '../services/state_service';
import {
  breakdownFieldSelector,
  chartHiddenSelector,
  timeIntervalSelector,
  totalHitsResultSelector,
  totalHitsStatusSelector,
  lensAdaptersSelector,
  lensEmbeddableOutputSelector$,
} from '../utils/state_selectors';
import { useStateSelector } from '../utils/use_state_selector';

export const useStateProps = ({
  stateService,
  dataView,
  query,
  searchSessionId,
  requestAdapter,
}: {
  stateService: UnifiedHistogramStateService | undefined;
  dataView: DataView;
  query: Query | AggregateQuery | undefined;
  searchSessionId: string | undefined;
  requestAdapter: RequestAdapter | undefined;
}) => {
  const breakdownField = useStateSelector(stateService?.state$, breakdownFieldSelector);
  const chartHidden = useStateSelector(stateService?.state$, chartHiddenSelector);
  const timeInterval = useStateSelector(stateService?.state$, timeIntervalSelector);
  const totalHitsResult = useStateSelector(stateService?.state$, totalHitsResultSelector);
  const totalHitsStatus = useStateSelector(stateService?.state$, totalHitsStatusSelector);
  const lensAdapters = useStateSelector(stateService?.state$, lensAdaptersSelector);
  const lensEmbeddableOutput$ = useStateSelector(
    stateService?.state$,
    lensEmbeddableOutputSelector$
  );
  /**
   * Contexts
   */

  const isPlainRecord = useMemo(() => {
    return (
      query &&
      isOfAggregateQueryType(query) &&
      ['sql', 'esql'].some((mode) => mode === getAggregateQueryMode(query))
    );
  }, [query]);

  const isTimeBased = useMemo(() => {
    return dataView && dataView.type !== DataViewType.ROLLUP && dataView.isTimeBased();
  }, [dataView]);

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
    if (!isTimeBased && !isPlainRecord) {
      return undefined;
    }

    return {
      hidden: chartHidden,
      timeInterval,
    };
  }, [chartHidden, isPlainRecord, isTimeBased, timeInterval]);

  const breakdown = useMemo(() => {
    if (isPlainRecord || !isTimeBased) {
      return undefined;
    }

    return {
      field: breakdownField ? dataView?.getFieldByName(breakdownField) : undefined,
    };
  }, [breakdownField, dataView, isPlainRecord, isTimeBased]);

  const request = useMemo(() => {
    return {
      searchSessionId,
      adapter: requestAdapter,
    };
  }, [requestAdapter, searchSessionId]);

  /**
   * Callbacks
   */

  const onTopPanelHeightChange = useCallback(
    (topPanelHeight: number | undefined) => {
      stateService?.setTopPanelHeight(topPanelHeight);
    },
    [stateService]
  );

  const onTimeIntervalChange = useCallback(
    (newTimeInterval: string) => {
      stateService?.setTimeInterval(newTimeInterval);
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
      stateService?.setLensEmbeddableOutput$(event.embeddableOutput$);
    },
    [stateService]
  );

  const onBreakdownFieldChange = useCallback(
    (newBreakdownField: DataViewField | undefined) => {
      stateService?.setBreakdownField(newBreakdownField?.name);
    },
    [stateService]
  );

  const onSuggestionContextChange = useCallback(
    (suggestionContext) => {
      stateService?.setCurrentSuggestionContext(suggestionContext);
    },
    [stateService]
  );

  /**
   * Effects
   */

  // Clear the Lens request adapter when the chart is hidden
  useEffect(() => {
    if (chartHidden || !chart) {
      stateService?.setLensRequestAdapter(undefined);
    }
  }, [chart, chartHidden, stateService]);

  return {
    hits,
    chart,
    breakdown,
    request,
    isPlainRecord,
    lensAdapters,
    lensEmbeddableOutput$,
    onTopPanelHeightChange,
    onTimeIntervalChange,
    onTotalHitsChange,
    onChartHiddenChange,
    onChartLoad,
    onBreakdownFieldChange,
    onSuggestionContextChange,
  };
};
