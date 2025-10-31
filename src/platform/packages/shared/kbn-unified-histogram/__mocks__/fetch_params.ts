/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewWithTimefieldMock } from './data_view_with_timefield';
import type { UnifiedHistogramFetchParams, UnifiedHistogramFetchParamsExternal } from '../types';
import { processFetchParams } from '../utils/process_fetch_params';
import { unifiedHistogramServicesMock } from './services';

export const getFetchParamsMock = (
  partialParams?: Partial<UnifiedHistogramFetchParamsExternal>
): UnifiedHistogramFetchParams => {
  return {
    ...processFetchParams({
      params: {
        searchSessionId: 'id',
        query: {
          language: 'kuery',
          query: '',
        },
        filters: [],
        timeRange: { from: '2025-09-30T22:00:00.000Z', to: '2025-10-31T13:16:54.878Z' },
        relativeTimeRange: { from: 'now-1M', to: 'now' },
        dataView: dataViewWithTimefieldMock,
        ...partialParams,
      },
      services: unifiedHistogramServicesMock,
    }),
  };
};
