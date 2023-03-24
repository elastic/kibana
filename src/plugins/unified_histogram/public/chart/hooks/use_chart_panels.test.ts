/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';
import { useChartPanels } from './use_chart_panels';
import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

describe('test useChartPanels', () => {
  test('useChartsPanel when hideChart is true', async () => {
    const { result } = renderHook(() => {
      return useChartPanels({
        toggleHideChart: jest.fn(),
        onTimeIntervalChange: jest.fn(),
        closePopover: jest.fn(),
        onResetChartHeight: jest.fn(),
        chart: {
          hidden: true,
          timeInterval: 'auto',
        },
      });
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(1);
    expect(panel0!.items).toHaveLength(1);
    expect(panel0!.items![0].icon).toBe('eye');
  });
  test('useChartsPanel when hideChart is false', async () => {
    const { result } = renderHook(() => {
      return useChartPanels({
        toggleHideChart: jest.fn(),
        onTimeIntervalChange: jest.fn(),
        closePopover: jest.fn(),
        onResetChartHeight: jest.fn(),
        chart: {
          hidden: false,
          timeInterval: 'auto',
        },
      });
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(2);
    expect(panel0!.items).toHaveLength(3);
    expect(panel0!.items![0].icon).toBe('eyeClosed');
    expect(panel0!.items![1].icon).toBe('refresh');
  });
  test('should not show reset chart height when onResetChartHeight is undefined', async () => {
    const { result } = renderHook(() => {
      return useChartPanels({
        toggleHideChart: jest.fn(),
        onTimeIntervalChange: jest.fn(),
        closePopover: jest.fn(),
        chart: {
          hidden: false,
          timeInterval: 'auto',
        },
      });
    });
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panel0!.items).toHaveLength(2);
    expect(panel0!.items![0].icon).toBe('eyeClosed');
  });
  test('onResetChartHeight is called when the reset chart height button is clicked', async () => {
    const onResetChartHeight = jest.fn();
    const { result } = renderHook(() => {
      return useChartPanels({
        toggleHideChart: jest.fn(),
        onTimeIntervalChange: jest.fn(),
        closePopover: jest.fn(),
        onResetChartHeight,
        chart: {
          hidden: false,
          timeInterval: 'auto',
        },
      });
    });
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    const resetChartHeightButton = panel0!.items![1];
    (resetChartHeightButton.onClick as Function)();
    expect(onResetChartHeight).toBeCalled();
  });
});
