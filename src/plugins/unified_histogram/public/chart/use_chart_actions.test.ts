/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { UnifiedHistogramChartContext } from '..';
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

  it('should toggle chart options', () => {
    const { hook } = render();
    expect(hook.result.current.showChartOptionsPopover).toBe(false);
    act(() => {
      hook.result.current.toggleChartOptions();
    });
    expect(hook.result.current.showChartOptionsPopover).toBe(true);
    act(() => {
      hook.result.current.toggleChartOptions();
    });
    expect(hook.result.current.showChartOptionsPopover).toBe(false);
  });

  it('should close chart options', () => {
    const { hook } = render();
    act(() => {
      hook.result.current.toggleChartOptions();
    });
    expect(hook.result.current.showChartOptionsPopover).toBe(true);
    act(() => {
      hook.result.current.closeChartOptions();
    });
    expect(hook.result.current.showChartOptionsPopover).toBe(false);
  });

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
