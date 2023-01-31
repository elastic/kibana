/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { BehaviorSubject } from 'rxjs';
import { UnifiedHistogramFetchStatus } from '../..';
import type { UnifiedHistogramServices } from '../../types';
import {
  getBreakdownField,
  getChartHidden,
  getTopPanelHeight,
  setBreakdownField,
  setChartHidden,
  setTopPanelHeight,
} from '../utils/local_storage_utils';

/**
 * The current state of the container
 */
export interface UnifiedHistogramState {
  /**
   * The current field used for the breakdown
   */
  breakdownField: string | undefined;
  /**
   * Whether or not the chart is hidden
   */
  chartHidden: boolean;
  /**
   * The current data view
   */
  dataView: DataView;
  /**
   * The current filters
   */
  filters: Filter[];
  /**
   * The current Lens request adapter
   */
  lensRequestAdapter: RequestAdapter | undefined;
  /**
   * The current query
   */
  query: Query | AggregateQuery;
  /**
   * The current request adapter used for non-Lens requests
   */
  requestAdapter: RequestAdapter | undefined;
  /**
   * The current search session ID
   */
  searchSessionId: string | undefined;
  /**
   * The current time interval of the chart
   */
  timeInterval: string;
  /**
   * The current time range
   */
  timeRange: TimeRange;
  /**
   * The current top panel height
   */
  topPanelHeight: number | undefined;
  /**
   * The current fetch status of the hits count request
   */
  totalHitsStatus: UnifiedHistogramFetchStatus;
  /**
   * The current result of the hits count request
   */
  totalHitsResult: number | Error | undefined;
}

/**
 * The options used to initialize the comntainer state
 */
export interface UnifiedHistogramStateOptions {
  /**
   * The services required by the Unified Histogram components
   */
  services: UnifiedHistogramServices;
  /**
   * The prefix for the keys used in local storage -- leave undefined to avoid using local storage
   */
  localStorageKeyPrefix?: string;
  /**
   * The initial state of the container
   */
  initialState: Partial<UnifiedHistogramState> & Pick<UnifiedHistogramState, 'dataView'>;
}

export type UnifiedHistogramStateService = ReturnType<typeof createStateService>;

export const createStateService = (options: UnifiedHistogramStateOptions) => {
  const { services, localStorageKeyPrefix, initialState } = options;

  let initialChartHidden = false;
  let initialTopPanelHeight: number | undefined;
  let initialBreakdownField: string | undefined;

  if (localStorageKeyPrefix) {
    initialChartHidden = getChartHidden(services.storage, localStorageKeyPrefix) ?? false;
    initialTopPanelHeight = getTopPanelHeight(services.storage, localStorageKeyPrefix);
    initialBreakdownField = getBreakdownField(services.storage, localStorageKeyPrefix);
  }

  const state$ = new BehaviorSubject<UnifiedHistogramState>({
    breakdownField: initialBreakdownField,
    chartHidden: initialChartHidden,
    filters: [],
    lensRequestAdapter: undefined,
    query: services.data.query.queryString.getDefaultQuery(),
    requestAdapter: undefined,
    searchSessionId: undefined,
    timeInterval: 'auto',
    timeRange: services.data.query.timefilter.timefilter.getTimeDefaults(),
    topPanelHeight: initialTopPanelHeight,
    totalHitsResult: undefined,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    ...initialState,
  });

  const updateState = (stateUpdate: Partial<UnifiedHistogramState>) => {
    state$.next({
      ...state$.getValue(),
      ...stateUpdate,
    });
  };

  return {
    /**
     * The current state of the container
     */
    state$,

    /**
     * Sets the current chart hidden state
     */
    setChartHidden: (chartHidden: boolean) => {
      if (localStorageKeyPrefix) {
        setChartHidden(services.storage, localStorageKeyPrefix, chartHidden);
      }

      updateState({ chartHidden });
    },

    /**
     * Sets the current top panel height
     */
    setTopPanelHeight: (topPanelHeight: number | undefined) => {
      if (localStorageKeyPrefix) {
        setTopPanelHeight(services.storage, localStorageKeyPrefix, topPanelHeight);
      }

      updateState({ topPanelHeight });
    },

    /**
     * Sets the current breakdown field
     */
    setBreakdownField: (breakdownField: string | undefined) => {
      if (localStorageKeyPrefix) {
        setBreakdownField(services.storage, localStorageKeyPrefix, breakdownField);
      }

      updateState({ breakdownField });
    },

    /**
     * Sets the current time interval
     */
    setTimeInterval: (timeInterval: string) => {
      updateState({ timeInterval });
    },

    /**
     * Sets the current request parameters
     */
    setRequestParams: (requestParams: {
      dataView?: DataView;
      filters?: Filter[];
      query?: Query | AggregateQuery;
      requestAdapter?: RequestAdapter | undefined;
      searchSessionId?: string | undefined;
      timeRange?: TimeRange;
    }) => {
      updateState(requestParams);
    },

    /**
     * Sets the current Lens request adapter
     */
    setLensRequestAdapter: (lensRequestAdapter: RequestAdapter | undefined) => {
      updateState({ lensRequestAdapter });
    },

    /**
     * Sets the current total hits status and result
     */
    setTotalHits: (totalHits: {
      totalHitsStatus: UnifiedHistogramFetchStatus;
      totalHitsResult: number | Error | undefined;
    }) => {
      // If we have a partial result already, we don't
      // want to update the total hits back to loading
      if (
        state$.getValue().totalHitsStatus === UnifiedHistogramFetchStatus.partial &&
        totalHits.totalHitsStatus === UnifiedHistogramFetchStatus.loading
      ) {
        return;
      }

      updateState(totalHits);
    },
  };
};
