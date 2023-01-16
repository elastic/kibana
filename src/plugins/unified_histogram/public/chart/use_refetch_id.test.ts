/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { renderHook } from '@testing-library/react-hooks';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramRequestContext,
} from '../types';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { useRefetchId } from './use_refetch_id';

describe('useRefetchId', () => {
  const getDeps: () => {
    dataView: DataView;
    lastReloadRequestTime: number | undefined;
    request: UnifiedHistogramRequestContext | undefined;
    hits: UnifiedHistogramHitsContext | undefined;
    chart: UnifiedHistogramChartContext | undefined;
    chartVisible: boolean;
    breakdown: UnifiedHistogramBreakdownContext | undefined;
    filters: Filter[];
    query: Query | AggregateQuery;
    relativeTimeRange: TimeRange;
  } = () => ({
    dataView: dataViewWithTimefieldMock,
    lastReloadRequestTime: 0,
    request: undefined,
    hits: undefined,
    chart: undefined,
    chartVisible: true,
    breakdown: undefined,
    filters: [],
    query: { language: 'kuery', query: '' },
    relativeTimeRange: { from: 'now-15m', to: 'now' },
  });

  it('should increment the refetchId when any of the arguments change', () => {
    const hook = renderHook((props) => useRefetchId(props), { initialProps: getDeps() });
    expect(hook.result.current).toBe(0);
    hook.rerender(getDeps());
    expect(hook.result.current).toBe(0);
    hook.rerender({
      ...getDeps(),
      lastReloadRequestTime: 1,
    });
    expect(hook.result.current).toBe(1);
    hook.rerender({
      ...getDeps(),
      lastReloadRequestTime: 1,
    });
    expect(hook.result.current).toBe(1);
    hook.rerender({
      ...getDeps(),
      lastReloadRequestTime: 1,
      query: { language: 'kuery', query: 'foo' },
    });
    expect(hook.result.current).toBe(2);
  });
});
