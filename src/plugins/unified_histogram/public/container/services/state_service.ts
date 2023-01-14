/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import type { RequestAdapter } from '@kbn/inspector-plugin/common';
import { isEqual } from 'lodash';
import { BehaviorSubject, distinctUntilChanged } from 'rxjs';
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

export interface UnifiedHistogramState {
  breakdownField: DataViewField | undefined;
  chartHidden: boolean;
  dataView: DataView;
  filters: Filter[];
  lensRequestAdapter: RequestAdapter | undefined;
  query: Query | AggregateQuery;
  requestAdapter: RequestAdapter | undefined;
  searchSessionId: string | undefined;
  timeInterval: string;
  timeRange: TimeRange;
  topPanelHeight: number | undefined;
  totalHitsStatus: UnifiedHistogramFetchStatus;
  totalHitsResult: number | Error | undefined;
}

export interface UnifiedHistogramStateOptions {
  services: UnifiedHistogramServices;
  localStorageKeyPrefix?: string;
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
      chartHidden = getChartHidden(services.storage, localStorageKeyPrefix);
      topPanelHeight = getTopPanelHeight(services.storage, localStorageKeyPrefix);
      breakdownField = getBreakdownField(services.storage, localStorageKeyPrefix);
    }

    this.services = services;
    this.state = {
      breakdownField: breakdownField
        ? initialState.dataView.getFieldByName(breakdownField)
        : undefined,
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

  public getState$() {
    return this.state$.pipe(distinctUntilChanged((prev, curr) => isEqual(prev, curr)));
  }

  public updateState(newState: Partial<UnifiedHistogramState>) {
    if (this.localStorageKeyPrefix) {
      if ('chartHidden' in newState) {
        setChartHidden(this.services.storage, this.localStorageKeyPrefix, newState.chartHidden);
      }

      if ('topPanelHeight' in newState) {
        setTopPanelHeight(
          this.services.storage,
          this.localStorageKeyPrefix,
          newState.topPanelHeight
        );
      }

      if ('breakdownField' in newState) {
        setBreakdownField(
          this.services.storage,
          this.localStorageKeyPrefix,
          newState.breakdownField?.name
        );
      }
    }

    this.state = {
      ...this.state,
      ...newState,
    };

    this.state$.next(this.state);
  }
}
