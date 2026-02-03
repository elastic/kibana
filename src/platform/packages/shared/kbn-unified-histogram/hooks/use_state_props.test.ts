/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DataView } from '@kbn/data-views-plugin/common';
import { DataViewField, DataViewType } from '@kbn/data-views-plugin/common';
import { RequestAdapter } from '@kbn/inspector-plugin/common';
import { waitFor, renderHook, act } from '@testing-library/react';
import type { DatatableColumn } from '@kbn/expressions-plugin/common';
import { convertDatatableColumnToDataViewFieldSpec } from '@kbn/data-view-utils';
import { UnifiedHistogramFetchStatus } from '../types';
import { dataViewMock } from '../__mocks__/data_view';
import { dataViewWithTimefieldMock } from '../__mocks__/data_view_with_timefield';
import { lensAdaptersMock } from '../__mocks__/lens_adapters';
import { unifiedHistogramServicesMock } from '../__mocks__/services';
import type {
  UnifiedHistogramState,
  UnifiedHistogramStateOptions,
} from '../services/state_service';
import { createStateService } from '../services/state_service';
import { useStateProps } from './use_state_props';
import { getFetchParamsMock } from '../__mocks__/fetch_params';

describe('useStateProps', () => {
  const initialState: UnifiedHistogramState = {
    chartHidden: false,
    lensRequestAdapter: new RequestAdapter(),
    lensAdapters: lensAdaptersMock,
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
    jest.spyOn(stateService, 'setLensRequestAdapter');
    jest.spyOn(stateService, 'setTotalHits');
    return stateService;
  };

  beforeEach(() => {
    (unifiedHistogramServicesMock.storage.set as jest.Mock).mockClear();
  });

  it('should return the correct props', () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "chart": Object {
          "hidden": false,
          "timeInterval": "auto",
        },
        "dataLoading$": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
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
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "topPanelHeight": 100,
      }
    `);
  });

  it('should return the correct props when an ES|QL query is used', () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { esql: 'FROM index' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: 'test-prefix',
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "chart": Object {
          "hidden": false,
          "timeInterval": "auto",
        },
        "dataLoading$": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
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
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "topPanelHeight": 100,
      }
    `);

    expect(result.current.chart).toStrictEqual({ hidden: false, timeInterval: 'auto' });
    expect(fetchParams.breakdown).toStrictEqual({ field: undefined });
    expect(unifiedHistogramServicesMock.storage.set).toHaveBeenCalledWith(
      'test-prefix:histogramBreakdownField',
      ''
    );
  });

  it('should return the correct props when an ES|QL query is used with transformational commands', () => {
    const stateService = getStateService({
      initialState: {
        ...initialState,
      },
    });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { esql: 'FROM index | keep field1' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: 'test-prefix',
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    expect(result.current.chart).toStrictEqual({ hidden: false, timeInterval: 'auto' });
    expect(fetchParams.breakdown).toBe(undefined);
    expect(unifiedHistogramServicesMock.storage.set).toHaveBeenCalledWith(
      'test-prefix:histogramBreakdownField',
      ''
    );
  });

  it('should return the correct props when an ES|QL query is used with breakdown field', () => {
    const breakdownField = 'extension';
    const esqlColumns = [
      {
        name: 'bytes',
        meta: { type: 'number' },
        id: 'bytes',
      },
      {
        name: 'extension',
        meta: { type: 'string' },
        id: 'extension',
      },
    ] as DatatableColumn[];
    const stateService = getStateService({
      initialState: {
        ...initialState,
      },
    });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { esql: 'FROM index' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: esqlColumns,
      breakdownField,
    });
    renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: 'test',
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );

    const breakdownColumn = esqlColumns.find((c) => c.name === breakdownField)!;
    const selectedField = new DataViewField(
      convertDatatableColumnToDataViewFieldSpec(breakdownColumn)
    );
    expect(fetchParams.breakdown).toStrictEqual({ field: selectedField });
    expect(unifiedHistogramServicesMock.storage.set).toHaveBeenCalledWith(
      'test:histogramBreakdownField',
      'extension'
    );
  });

  it('should call the setBreakdown cb when an ES|QL query is used', () => {
    const breakdownField = 'extension';
    const esqlColumns = [
      {
        name: 'bytes',
        meta: { type: 'number' },
        id: 'bytes',
      },
      {
        name: 'extension',
        meta: { type: 'string' },
        id: 'extension',
      },
    ] as DatatableColumn[];
    const stateService = getStateService({
      initialState: {
        ...initialState,
      },
    });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { esql: 'FROM index' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: esqlColumns,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    const { onBreakdownFieldChange } = result.current;
    act(() => {
      onBreakdownFieldChange({ name: breakdownField } as DataViewField);
    });
  });

  it('should return the correct props when a rollup data view is used', () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: {
        ...dataViewWithTimefieldMock,
        type: DataViewType.ROLLUP,
      } as DataView,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "chart": undefined,
        "dataLoading$": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
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
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "topPanelHeight": 100,
      }
    `);
  });

  it('should return the correct props when a non time based data view is used', () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewMock,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );
    expect(result.current).toMatchInlineSnapshot(`
      Object {
        "chart": undefined,
        "dataLoading$": undefined,
        "hits": Object {
          "status": "uninitialized",
          "total": undefined,
        },
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
        "onBreakdownFieldChange": [Function],
        "onChartHiddenChange": [Function],
        "onChartLoad": [Function],
        "onTimeIntervalChange": [Function],
        "onTopPanelHeightChange": [Function],
        "onTotalHitsChange": [Function],
        "topPanelHeight": 100,
      }
    `);
  });

  it('should execute callbacks correctly', async () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const { result } = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
      })
    );

    await waitFor(() =>
      expect(result.current).toEqual(
        expect.objectContaining({
          onTopPanelHeightChange: expect.any(Function),
          onTimeIntervalChange: expect.any(Function),
          onTotalHitsChange: expect.any(Function),
          onChartHiddenChange: expect.any(Function),
          onChartLoad: expect.any(Function),
          onBreakdownFieldChange: expect.any(Function),
        })
      )
    );

    const {
      onTopPanelHeightChange,
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
  });

  it('should clear lensRequestAdapter when chart is hidden', () => {
    const stateService = getStateService({ initialState });
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    });
    const hook = renderHook(() =>
      useStateProps({
        services: unifiedHistogramServicesMock,
        localStorageKeyPrefix: undefined,
        stateService,
        fetchParams,
        onBreakdownFieldChange: undefined,
        onTimeIntervalChange: undefined,
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

  it('should clear lensRequestAdapter when chart is undefined', async () => {
    const stateService = getStateService({ initialState });
    const commonFetchParams = {
      query: { language: 'kuery', query: '' },
      requestAdapter: new RequestAdapter(),
      searchSessionId: '123',
      columns: undefined,
    };
    const fetchParams = getFetchParamsMock({
      dataView: dataViewWithTimefieldMock,
      ...commonFetchParams,
    });
    const initialProps = {
      services: unifiedHistogramServicesMock,
      localStorageKeyPrefix: undefined,
      stateService,
      fetchParams,
      onBreakdownFieldChange: undefined,
      onTimeIntervalChange: undefined,
    };
    const hook = renderHook((props: Parameters<typeof useStateProps>[0]) => useStateProps(props), {
      initialProps,
    });
    (stateService.setLensRequestAdapter as jest.Mock).mockClear();
    expect(stateService.setLensRequestAdapter).not.toHaveBeenCalled();
    const updatedFetchParams = getFetchParamsMock({
      dataView: dataViewMock,
      ...commonFetchParams,
    });
    hook.rerender({
      ...initialProps,
      fetchParams: updatedFetchParams,
    });
    await waitFor(() => {
      expect(stateService.setLensRequestAdapter).toHaveBeenLastCalledWith(undefined);
    });
  });
});
