/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { renderHook } from '@testing-library/react-hooks';

import { useChartPanels } from './use_chart_panels';
import { AppState } from '../../services/discover_state';
import { BehaviorSubject } from 'rxjs';
import { DataCharts$ } from '../../services/use_saved_search';
import { FetchStatus } from '../../../../types';
import { EuiContextMenuPanelDescriptor } from '@elastic/eui';

describe('test useChartPanels', () => {
  test('useChartsPanel when hideChart is true', async () => {
    const charts$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
    }) as DataCharts$;
    const { result } = renderHook(() => {
      return useChartPanels(
        { hideChart: true, interval: 'auto' } as AppState,
        charts$,
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(1);
    expect(panel0!.items![0].icon).toBe('eye');
  });
  test('useChartsPanel when hideChart is false', async () => {
    const charts$ = new BehaviorSubject({
      fetchStatus: FetchStatus.COMPLETE,
    }) as DataCharts$;
    const { result } = renderHook(() => {
      return useChartPanels(
        { hideChart: false, interval: 'auto' } as AppState,
        charts$,
        jest.fn(),
        jest.fn(),
        jest.fn()
      );
    });
    const panels: EuiContextMenuPanelDescriptor[] = result.current;
    const panel0: EuiContextMenuPanelDescriptor = result.current[0];
    expect(panels.length).toBe(2);
    expect(panel0!.items![0].icon).toBe('eyeClosed');
  });
});
