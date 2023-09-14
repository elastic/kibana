/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import { DataView, DataViewField, DataViewType } from '@kbn/data-views-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { Suggestion } from '@kbn/lens-plugin/public';
import { renderHook } from '@testing-library/react-hooks';
import { act } from 'react-test-renderer';
import { UnifiedHistogramFetchStatus } from '../../types';
import { dataViewMock } from '../../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../../__mocks__/data_view_with_timefield';
import { currentSuggestionMock } from '../../__mocks__/suggestions';
import { lensAdaptersMock } from '../../__mocks__/lens_adapters';
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
    lensRequestAdapter: new RequestAdapter(),
    lensAdapters: lensAdaptersMock,
    timeInterval: 'auto',
    topPanelHeight: 100,
    totalHitsStatus: UnifiedHistogramFetchStatus.uninitialized,
    totalHitsResult: undefined,
    currentSuggestion: undefined,
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
    jest.spyOn(stateService, 'setLensRequestAdapter');
    jest.spyOn(stateService, 'setTotalHits');
    jest.spyOn(stateService, 'setCurrentSuggestion');
    return stateService;
  };

  it('should return the correct props', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        stateService,
        dataView: dataViewWithTimefieldMock,
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
      })
    );
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
        "isPlainRecord": false,
        "lensAdapters": Object {
          "tables": Object {
            "tables": Object {
              "default": Object {
                "columns": Array [
                  Object {
                    "id": "col-0-1",
                    "meta": Object {
                      "dimensionName": "Slice size",
                      "type": "number",
                    },
                    "name": "Field 1",
                  },
                  Object {
                    "id": "col-0-2",
                    "meta": Object {
                      "dimensionName": "Slice",
                      "type": "number",
                    },
                    "name": "Field 2",
                  },
                ],
                "rows": Array [
                  Object {
                    "col-0-1": 0,
                    "col-0-2": 0,
                    "col-0-3": 0,
                    "col-0-4": 0,
                  },
                ],
                "type": "datatable",
              },
            },
          },
        },
        "lensEmbeddableOutput$": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onSuggestionChange": [Function],
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

  it('should return the correct props when an ES|QL query is used', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        stateService,
        dataView: dataViewWithTimefieldMock,
        query: { esql: 'FROM index' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "breakdown": undefined,
        "chart": Object {
          "hidden": false,
          "timeInterval": "auto",
        },
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
        "isPlainRecord": true,
        "lensAdapters": Object {
          "tables": Object {
            "tables": Object {
              "default": Object {
                "columns": Array [
                  Object {
                    "id": "col-0-1",
                    "meta": Object {
                      "dimensionName": "Slice size",
                      "type": "number",
                    },
                    "name": "Field 1",
                  },
                  Object {
                    "id": "col-0-2",
                    "meta": Object {
                      "dimensionName": "Slice",
                      "type": "number",
                    },
                    "name": "Field 2",
                  },
                ],
                "rows": Array [
                  Object {
                    "col-0-1": 0,
                    "col-0-2": 0,
                    "col-0-3": 0,
                    "col-0-4": 0,
                  },
                ],
                "type": "datatable",
              },
            },
          },
        },
        "lensEmbeddableOutput$": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onSuggestionChange": [Function],
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

  it('should return the correct props when a text based language is used', () => {
    const stateService = getStateService({
      initialState: {
        ...initialState,
        currentSuggestion: currentSuggestionMock,
      },
    });
    const { result } = renderHook(() =>
      useStateProps({
        stateService,
        dataView: dataViewWithTimefieldMock,
        query: { esql: 'FROM index' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
      })
    );
    expect(result.current.chart).toStrictEqual({ hidden: false, timeInterval: 'auto' });
    expect(result.current.breakdown).toBe(undefined);
    expect(result.current.isPlainRecord).toBe(true);
  });

  it('should return the correct props when a rollup data view is used', () => {
    const stateService = getStateService({ initialState });
    const { result } = renderHook(() =>
      useStateProps({
        stateService,
        dataView: {
          ...dataViewWithTimefieldMock,
          type: DataViewType.ROLLUP,
        } as DataView,
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
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
        "isPlainRecord": false,
        "lensAdapters": Object {
          "tables": Object {
            "tables": Object {
              "default": Object {
                "columns": Array [
                  Object {
                    "id": "col-0-1",
                    "meta": Object {
                      "dimensionName": "Slice size",
                      "type": "number",
                    },
                    "name": "Field 1",
                  },
                  Object {
                    "id": "col-0-2",
                    "meta": Object {
                      "dimensionName": "Slice",
                      "type": "number",
                    },
                    "name": "Field 2",
                  },
                ],
                "rows": Array [
                  Object {
                    "col-0-1": 0,
                    "col-0-2": 0,
                    "col-0-3": 0,
                    "col-0-4": 0,
                  },
                ],
                "type": "datatable",
              },
            },
          },
        },
        "lensEmbeddableOutput$": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onSuggestionChange": [Function],
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
        stateService,
        dataView: dataViewMock,
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
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
        "isPlainRecord": false,
        "lensAdapters": Object {
          "tables": Object {
            "tables": Object {
              "default": Object {
                "columns": Array [
                  Object {
                    "id": "col-0-1",
                    "meta": Object {
                      "dimensionName": "Slice size",
                      "type": "number",
                    },
                    "name": "Field 1",
                  },
                  Object {
                    "id": "col-0-2",
                    "meta": Object {
                      "dimensionName": "Slice",
                      "type": "number",
                    },
                    "name": "Field 2",
                  },
                ],
                "rows": Array [
                  Object {
                    "col-0-1": 0,
                    "col-0-2": 0,
                    "col-0-3": 0,
                    "col-0-4": 0,
                  },
                ],
                "type": "datatable",
              },
            },
          },
        },
        "lensEmbeddableOutput$": undefined,
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onSuggestionChange": [Function],
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
    const { result } = renderHook(() =>
      useStateProps({
        stateService,
        dataView: dataViewWithTimefieldMock,
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
      })
    );
    const {
      onTopPanelHeightChange,
      onTimeIntervalChange,
      onTotalHitsChange,
      onChartHiddenChange,
      onChartLoad,
      onBreakdownFieldChange,
      onSuggestionChange,
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

    act(() => {
      onSuggestionChange({ title: 'Stacked Bar' } as Suggestion);
    });
    expect(stateService.setCurrentSuggestion).toHaveBeenLastCalledWith({ title: 'Stacked Bar' });
  });

  it('should clear lensRequestAdapter when chart is hidden', () => {
    const stateService = getStateService({ initialState });
    const hook = renderHook(() =>
      useStateProps({
        stateService,
        dataView: dataViewWithTimefieldMock,
        query: { language: 'kuery', query: '' },
        requestAdapter: new RequestAdapter(),
        searchSessionId: '123',
      })
    );
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
    const initialProps = {
      stateService,
      dataView: dataViewWithTimefieldMock,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
    };
    const hook = renderHook((props: Parameters<typeof useStateProps>[0]) => useStateProps(props), {
      initialProps,
    });
    (stateService.setLensRequestAdapter as jest.Mock).mockClear();
    expect(stateService.setLensRequestAdapter).not.toHaveBeenCalled();
    hook.rerender({
      ...initialProps,
      dataView: dataViewMock,
    });
    expect(stateService.setLensRequestAdapter).toHaveBeenLastCalledWith(undefined);
  });
});
