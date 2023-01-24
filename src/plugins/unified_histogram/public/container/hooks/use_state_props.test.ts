/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { renderHook } from '@testing-library/react-hooks';
import { UnifiedHistogramFetchStatus } from '../../types';
import { dataViewMock } from '../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import {
  UnifiedHistogramState,
  UnifiedHistogramStateOptions,
  UnifiedHistogramStateService,
} from '../services/state_service';
import { useStateProps } from './use_state_props';

describe('useStateProps', () => {
  const initialState: UnifiedHistogramState = {
    breakdownField: 'bytes',
    chartHidden: false,
    dataView: dataViewWithTimefieldMock,
    filters: [],
    lensRequestAdapter: new RequestAdapter(),
    query: { language: 'kuery', query: '' },
    requestAdapter: new RequestAdapter(),
    searchSessionId: '123',
    timeInterval: 'auto',
    timeRange: { from: 'now-15m', to: 'now' },
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
  };

  const getStateService = (options: Omit<UnifiedHistogramStateOptions, 'services'>) => {
    const stateService = new UnifiedHistogramStateService({
      ...options,
      services: unifiedHistogramServicesMock,
    });
    jest.spyOn(stateService, 'updateState');
    return stateService;
  };

  it('should return the correct props', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() => useStateProps({ state: initialState, stateService }));
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": Object {
          "field": Object {
            "aggregatable": true,
            "displayName": "bytes",
            "filterable": true,
            "name": "bytes",
            "scripted": false,
            "type": "number",
          },
        },
        "chart": Object {
          "hidden": false,
          "timeInterval": "auto",
        },
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "request": Object {
          "adapter": RequestAdapter {
            "_events": Object {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            "requests": Map {},
            Symbol(kCapture): false,
          },
          "searchSessionId": "123",
        },
      }
    `);
  });

  it('should return the correct props when the state is undefined', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() => useStateProps({ state: undefined, stateService }));
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": undefined,
        "chart": undefined,
        "hits": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "request": undefined,
      }
    `);
  });

  it('should return the correct props when an SQL query is used', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        state: {
          ...initialState,
          query: { sql: 'SELECT * FROM index' },
        },
        stateService,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": undefined,
        "chart": undefined,
        "hits": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "request": Object {
          "adapter": RequestAdapter {
            "_events": Object {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            "requests": Map {},
            Symbol(kCapture): false,
          },
          "searchSessionId": "123",
        },
      }
    `);
  });

  it('should return the correct props when a rollup data view is used', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        state: {
          ...initialState,
          dataView: {
            ...dataViewWithTimefieldMock,
            type: DataViewType.ROLLUP,
          } as DataView,
        },
        stateService,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": undefined,
        "chart": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "request": Object {
          "adapter": RequestAdapter {
            "_events": Object {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            "requests": Map {},
            Symbol(kCapture): false,
          },
          "searchSessionId": "123",
        },
      }
    `);
  });

  it('should return the correct props when a non time based data view is used', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        state: {
          ...initialState,
          dataView: dataViewMock,
        },
        stateService,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": undefined,
        "chart": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "request": Object {
          "adapter": RequestAdapter {
            "_events": Object {},
            "_eventsCount": 0,
            "_maxListeners": undefined,
            "requests": Map {},
            Symbol(kCapture): false,
          },
          "searchSessionId": "123",
        },
      }
    `);
  });

  it('should execute callbacks correctly', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() => useStateProps({ state: initialState, stateService }));
    const {
      onTopPanelHeightChange,
      onTimeIntervalChange,
      onTotalHitsChange,
      onChartHiddenChange,
      onChartLoad,
      onBreakdownFieldChange,
    } = result.current;
    onTopPanelHeightChange(200);
    expect(stateService.updateState).toHaveBeenLastCalledWith({ topPanelHeight: 200 });
    onTimeIntervalChange('1d');
    expect(stateService.updateState).toHaveBeenLastCalledWith({ timeInterval: '1d' });
    onTotalHitsChange(UnifiedHistogramFetchStatus.complete, 100);
    expect(stateService.updateState).toHaveBeenLastCalledWith({
      totalHitsStatus: UnifiedHistogramFetchStatus.complete,
      totalHitsResult: 100,
    });
    onChartHiddenChange(true);
    expect(stateService.updateState).toHaveBeenLastCalledWith({ chartHidden: true });
    const requests = new RequestAdapter();
    onChartLoad({ adapters: { requests } });
    expect(stateService.updateState).toHaveBeenLastCalledWith({ lensRequestAdapter: requests });
    onBreakdownFieldChange({ name: 'field' } as DataViewField);
    expect(stateService.updateState).toHaveBeenLastCalledWith({ breakdownField: 'field' });
  });

  it('should not update total hits to loading when the current status is partial', () => {
    const state = {
      ...initialState,
      totalHitsStatus: UnifiedHistogramFetchStatus.partial,
      totalHitsResult: 100,
    };
    const stateService = getStateService({ initialState: state });
    const { result } = renderHook(() => useStateProps({ state, stateService }));
    const { onTotalHitsChange } = result.current;
    onTotalHitsChange(UnifiedHistogramFetchStatus.loading, 100);
    expect(stateService.updateState).not.toHaveBeenCalled();
  });

  it('should clear lensRequestAdapter when chart is hidden', () => {
    const stateService = getStateService({ initialState });
    const hook = renderHook(
      (state: UnifiedHistogramState) => useStateProps({ state, stateService }),
      { initialProps: initialState }
    );
    expect(stateService.updateState).not.toHaveBeenCalled();
    hook.rerender({ ...initialState, chartHidden: true });
    expect(stateService.updateState).toHaveBeenLastCalledWith({ lensRequestAdapter: undefined });
  });

  it('should clear lensRequestAdapter when chart is undefined', () => {
    const stateService = getStateService({ initialState });
    const hook = renderHook(
      (state: UnifiedHistogramState) => useStateProps({ state, stateService }),
      { initialProps: initialState }
    );
    expect(stateService.updateState).not.toHaveBeenCalled();
    hook.rerender({ ...initialState, dataView: dataViewMock });
    expect(stateService.updateState).toHaveBeenLastCalledWith({ lensRequestAdapter: undefined });
  });
});
