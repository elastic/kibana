/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { renderHook } from '@testing-library/react';
import { ChartLoadedProvider, useReportChartPanel } from './chart_loaded_context';

describe('ChartLoadedProvider', () => {
  const setup = () => {
    const onChartLoaded = jest.fn();
    const { result } = renderHook(() => useReportChartPanel(), {
      wrapper: ({ children }) => (
        <ChartLoadedProvider onChartLoaded={onChartLoaded}>{children}</ChartLoadedProvider>
      ),
    });
    return { onChartLoaded, report: result.current! };
  };

  it('reports as soon as one panel has data', () => {
    const { onChartLoaded, report } = setup();
    report('a', 'loading');
    report('b', 'loading');
    report('a', 'loaded');

    expect(onChartLoaded).toHaveBeenCalledWith();
  });

  it('waits for all panels before reporting empty', () => {
    const { onChartLoaded, report } = setup();
    report('a', 'loading');
    report('b', 'loading');
    report('a', 'empty');
    expect(onChartLoaded).not.toHaveBeenCalled();

    report('b', 'empty');
    expect(onChartLoaded).toHaveBeenCalledWith({ isEmpty: true });
  });

  it('ignores removed panels', () => {
    const { onChartLoaded, report } = setup();
    report('a', 'loading');
    report('b', 'empty');
    report('a', 'removed');

    expect(onChartLoaded).toHaveBeenLastCalledWith({ isEmpty: true });
  });

  it('forgets the panel states of a previous search', () => {
    const first = jest.fn();
    const second = jest.fn();
    let onChartLoaded = first;
    const { result, rerender } = renderHook(() => useReportChartPanel(), {
      wrapper: ({ children }) => (
        <ChartLoadedProvider onChartLoaded={onChartLoaded}>{children}</ChartLoadedProvider>
      ),
    });
    result.current!('a', 'loaded');
    result.current!('b', 'empty');

    onChartLoaded = second;
    rerender();
    result.current!('b', 'empty');

    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith({ isEmpty: true });
  });

  it('provides no reporter without a callback', () => {
    const { result } = renderHook(() => useReportChartPanel(), {
      wrapper: ({ children }) => (
        <ChartLoadedProvider onChartLoaded={undefined}>{children}</ChartLoadedProvider>
      ),
    });

    expect(result.current).toBeUndefined();
  });
});
