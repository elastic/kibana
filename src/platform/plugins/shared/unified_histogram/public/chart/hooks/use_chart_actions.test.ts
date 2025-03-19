/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook } from '@testing-library/react';
import { UnifiedHistogramChartContext } from '../../types';
import { useChartActions } from './use_chart_actions';

describe('useChartActions', () => {
  const render = () => {
    const chart: UnifiedHistogramChartContext = {
      hidden: false,
      timeInterval: 'auto',
    };
    const onChartHiddenChange = jest.fn((hidden: boolean) => {
      chart.hidden = hidden;
    });
    return {
      chart,
      onChartHiddenChange,
      hook: renderHook(() => useChartActions({ chart, onChartHiddenChange })),
    };
  };

  it('should toggle hide chart', () => {
    const { chart, onChartHiddenChange, hook } = render();
    act(() => {
      hook.result.current.toggleHideChart();
    });
    expect(chart.hidden).toBe(true);
    expect(onChartHiddenChange).toBeCalledWith(true);
    act(() => {
      hook.result.current.toggleHideChart();
    });
    expect(chart.hidden).toBe(false);
    expect(onChartHiddenChange).toBeCalledWith(false);
  });

  it('should focus chart element', () => {
    const { chart, hook } = render();
    hook.result.current.chartRef.current.element = document.createElement('div');
    hook.result.current.chartRef.current.element.focus = jest.fn();
    chart.hidden = true;
    hook.rerender();
    act(() => {
      hook.result.current.toggleHideChart();
    });
    hook.rerender();
    expect(hook.result.current.chartRef.current.moveFocus).toBe(true);
    expect(hook.result.current.chartRef.current.element.focus).toBeCalled();
  });
});
