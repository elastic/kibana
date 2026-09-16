/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { DataViewSource } from '@kbn/data-source';
import { dataViewWithTimefieldMock } from './data_view_with_timefield';
import type {
  UnifiedHistogramFetchParams,
  UnifiedHistogramFetchParamsExternal,
  UnifiedHistogramFetch$Arguments,
} from '../types';
import { ReplaySubject } from 'rxjs';
import { RequestAdapter } from '@kbn/inspector-plugin/common';

const defaultDataSource = new DataViewSource(dataViewWithTimefieldMock);

export const getFetchParamsMock = (
  partialParams?: Partial<UnifiedHistogramFetchParamsExternal>
): UnifiedHistogramFetchParams => {
  const dataSource = (partialParams?.dataSource as DataViewSource | undefined) ?? defaultDataSource;

  return {
    dataSource,
    searchSessionId: 'id',
    query: { language: 'kuery', query: '' },
    filters: [],
    timeRange: { from: '2025-10-07T22:00:00.000Z', to: '2025-11-07T15:56:36.264Z' },
    relativeTimeRange: { from: 'now-30d/d', to: 'now' },
    requestAdapter: new RequestAdapter(),
    esqlVariables: [],
    lastReloadRequestTime: Date.now(),
    isESQLQuery: false,
    isTimeBased: dataSource.isTimeBased() && !dataSource.isRollup(),
    columnsMap: undefined,
    breakdown:
      dataSource.isTimeBased() && !dataSource.isRollup() ? { field: undefined } : undefined,
    timeInterval: 'auto',
    ...partialParams,
  };
};

export const getFetch$Mock = (
  fetchParams?: UnifiedHistogramFetch$Arguments['fetchParams'],
  lensVisServiceState?: UnifiedHistogramFetch$Arguments['lensVisServiceState']
) => {
  const fetch$ = new ReplaySubject<UnifiedHistogramFetch$Arguments>(1);
  if (fetchParams) {
    fetch$.next({ fetchParams, lensVisServiceState });
  }
  return fetch$;
};
