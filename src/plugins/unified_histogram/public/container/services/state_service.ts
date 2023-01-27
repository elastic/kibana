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
import { isEqual } from 'lodash';
import { BehaviorSubject, distinctUntilChanged, map, Observable } from 'rxjs';
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

export class UnifiedHistogramStateService {
  private localStorageKeyPrefix?: string;
  private services: UnifiedHistogramServices;
  private state: UnifiedHistogramState;
  private state$: BehaviorSubject<UnifiedHistogramState>;

  constructor(options: UnifiedHistogramStateOptions) {
    const { services, localStorageKeyPrefix, initialState } = options;

    let chartHidden = false;
    let topPanelHeight: number | undefined;
    let breakdownField: string | undefined;

    if (localStorageKeyPrefix) {
      this.localStorageKeyPrefix = localStorageKeyPrefix;
      chartHidden = getChartHidden(services.storage, localStorageKeyPrefix) ?? false;
      topPanelHeight = getTopPanelHeight(services.storage, localStorageKeyPrefix);
      breakdownField = getBreakdownField(services.storage, localStorageKeyPrefix);
    }

    this.services = services;
    this.state = {
      breakdownField,
      chartHidden,
      filters: [],
      lensRequestAdapter: undefined,
      query: services.data.query.queryString.getDefaultQuery(),
      requestAdapter: undefined,
      searchSessionId: undefined,
      timeInterval: 'auto',
      timeRange: services.data.query.timefilter.timefilter.getTimeDefaults(),
      topPanelHeight,
      totalHitsResult: undefined,
      totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
      ...initialState,
    };
    this.state$ = new BehaviorSubject(this.state);
  }

  public getState$<T = UnifiedHistogramState>(
    selector?: (state: UnifiedHistogramState) => T
  ): Observable<T> {
    if (selector) {
      return this.state$.pipe(map(selector), distinctUntilChanged(isEqual));
    }

    return this.state$.pipe(distinctUntilChanged(isEqual));
  }

  public updateState(stateUpdate: Partial<UnifiedHistogramState>) {
    if (this.localStorageKeyPrefix) {
      if ('chartHidden' in stateUpdate) {
        setChartHidden(this.services.storage, this.localStorageKeyPrefix, stateUpdate.chartHidden);
      }

      if ('topPanelHeight' in stateUpdate) {
        setTopPanelHeight(
          this.services.storage,
          this.localStorageKeyPrefix,
          stateUpdate.topPanelHeight
        );
      }

      if ('breakdownField' in stateUpdate) {
        setBreakdownField(
          this.services.storage,
          this.localStorageKeyPrefix,
          stateUpdate.breakdownField
        );
      }
    }

    this.state = {
      ...this.state,
      ...stateUpdate,
    };

    this.state$.next(this.state);
  }
}
