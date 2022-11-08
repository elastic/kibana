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
      return useChartPanels(jest.fn(), jest.fn(), jest.fn(), true, 'auto');
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(1);
    expect(panel0!.items![0].icon).toBe('eye');
  });
  test('useChartsPanel when hideChart is false', async () => {
    const { result } = renderHook(() => {
      return useChartPanels(jest.fn(), jest.fn(), jest.fn(), false, 'auto');
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(2);
    expect(panel0!.items![0].icon).toBe('eyeClosed');
  });
});
