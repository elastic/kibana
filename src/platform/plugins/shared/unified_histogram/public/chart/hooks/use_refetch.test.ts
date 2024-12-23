/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useRefetch } from './use_refetch';
import { DataView } from '@kbn/data-views-plugin/common';
import { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { renderHook } from '@testing-library/react';
import {
  UnifiedHistogramBreakdownContext,
  UnifiedHistogramChartContext,
  UnifiedHistogramHitsContext,
  UnifiedHistogramInput$,
  UnifiedHistogramRequestContext,
} from '../../types';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { Subject } from 'rxjs';

describe('useRefetch', () => {
  const getDeps: () => {
    dataView: DataView;
    request: UnifiedHistogramRequestContext | undefined;
    hits: UnifiedHistogramHitsContext | undefined;
    chart: UnifiedHistogramChartContext | undefined;
    chartVisible: boolean;
    breakdown: UnifiedHistogramBreakdownContext | undefined;
    filters: Filter[];
    query: Query | AggregateQuery;
    relativeTimeRange: TimeRange;
    input$: UnifiedHistogramInput$;
    beforeRefetch: () => void;
  } = () => ({
    dataView: dataViewWithTimefieldMock,
    request: undefined,
    hits: undefined,
    chart: undefined,
    chartVisible: true,
    breakdown: undefined,
    filters: [],
    query: { language: 'kuery', query: '' },
    relativeTimeRange: { from: 'now-15m', to: 'now' },
    input$: new Subject(),
    beforeRefetch: () => {},
  });

  it('should trigger the refetch observable when any of the arguments change', () => {
    const originalDeps = getDeps();
    const hook = renderHook((deps) => useRefetch(deps), {
      initialProps: originalDeps,
    });
    const refetch = jest.fn();
    hook.result.current.subscribe(refetch);
    hook.rerender({ ...originalDeps });
    expect(refetch).not.toHaveBeenCalled();
    hook.rerender({ ...originalDeps, chartVisible: false });
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('should not trigger the refetch observable when disableAutoFetching is true', () => {
    const originalDeps = { ...getDeps(), disableAutoFetching: true };
    const hook = renderHook((deps) => useRefetch(deps), {
      initialProps: originalDeps,
    });
    const refetch = jest.fn();
    hook.result.current.subscribe(refetch);
    hook.rerender({ ...originalDeps, chartVisible: false });
    expect(refetch).not.toHaveBeenCalled();
  });

  it('should trigger the refetch observable when the input$ observable is triggered', () => {
    const originalDeps = { ...getDeps(), disableAutoFetching: true };
    const hook = renderHook((deps) => useRefetch(deps), {
      initialProps: originalDeps,
    });
    const refetch = jest.fn();
    hook.result.current.subscribe(refetch);
    expect(refetch).not.toHaveBeenCalled();
    originalDeps.input$.next({ type: 'refetch' });
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
