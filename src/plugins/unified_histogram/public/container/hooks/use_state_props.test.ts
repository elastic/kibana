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
import { act } from 'react-test-renderer';
import { UnifiedHistogramFetchStatus } from '../../types';
import { dataViewMock } from '../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { unifiedHistogramServicesMock } from '../../__mocks__/services';
import {
  createStateService,
  UnifiedHistogramState,
  UnifiedHistogramStateOptions,
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
    const stateService = createStateService({
      ...options,
      services: unifiedHistogramServicesMock,
    });
    jest.spyOn(stateService, 'setChartHidden');
    jest.spyOn(stateService, 'setTopPanelHeight');
    jest.spyOn(stateService, 'setBreakdownField');
    jest.spyOn(stateService, 'setTimeInterval');
    jest.spyOn(stateService, 'setRequestParams');
    jest.spyOn(stateService, 'setLensRequestAdapter');
    jest.spyOn(stateService, 'setTotalHits');
    return stateService;
  };

  it('should return the correct props', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() => useStateProps(stateService));
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

  it('should return the correct props when an SQL query is used', () => {
    const stateService = getStateService({
      initialState: { ...initialState, query: { sql: 'SELECT * FROM index' } },
    });
    const { result } = renderHook(() => useStateProps(stateService));
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
    const stateService = getStateService({
      initialState: {
        ...initialState,
        dataView: {
          ...dataViewWithTimefieldMock,
          type: DataViewType.ROLLUP,
        } as DataView,
      },
    });
    const { result } = renderHook(() => useStateProps(stateService));
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
    const stateService = getStateService({
      initialState: { ...initialState, dataView: dataViewMock },
    });
    const { result } = renderHook(() => useStateProps(stateService));
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
    const { result } = renderHook(() => useStateProps(stateService));
    const {
      onTopPanelHeightChange,
      onTimeIntervalChange,
      onTotalHitsChange,
      onChartHiddenChange,
      onChartLoad,
      onBreakdownFieldChange,
    } = result.current;
    act(() => {
      onTopPanelHeightChange(200);
    });
    expect(stateService.setTopPanelHeight).toHaveBeenLastCalledWith(200);
    act(() => {
      onTimeIntervalChange('1d');
    });
    expect(stateService.setTimeInterval).toHaveBeenLastCalledWith('1d');
    act(() => {
      onTotalHitsChange(UnifiedHistogramFetchStatus.complete, 100);
    });
    expect(stateService.setTotalHits).toHaveBeenLastCalledWith({
      totalHitsStatus: UnifiedHistogramFetchStatus.complete,
      totalHitsResult: 100,
    });
    act(() => {
      onChartHiddenChange(true);
    });
    expect(stateService.setChartHidden).toHaveBeenLastCalledWith(true);
    const requests = new RequestAdapter();
    act(() => {
      onChartLoad({ adapters: { requests } });
    });
    expect(stateService.setLensRequestAdapter).toHaveBeenLastCalledWith(requests);
    act(() => {
      onBreakdownFieldChange({ name: 'field' } as DataViewField);
    });
    expect(stateService.setBreakdownField).toHaveBeenLastCalledWith('field');
  });

  it('should clear lensRequestAdapter when chart is hidden', () => {
    const stateService = getStateService({ initialState });
    const hook = renderHook(() => useStateProps(stateService));
    (stateService.setLensRequestAdapter as jest.Mock).mockClear();
    expect(stateService.setLensRequestAdapter).not.toHaveBeenCalled();
    act(() => {
      stateService.setChartHidden(true);
    });
    hook.rerender();
    expect(stateService.setLensRequestAdapter).toHaveBeenLastCalledWith(undefined);
  });

  it('should clear lensRequestAdapter when chart is undefined', () => {
    const stateService = getStateService({ initialState });
    const hook = renderHook(() => useStateProps(stateService));
    (stateService.setLensRequestAdapter as jest.Mock).mockClear();
    expect(stateService.setLensRequestAdapter).not.toHaveBeenCalled();
    act(() => {
      stateService.setRequestParams({ dataView: dataViewMock });
    });
    hook.rerender();
    expect(stateService.setLensRequestAdapter).toHaveBeenLastCalledWith(undefined);
  });
});
