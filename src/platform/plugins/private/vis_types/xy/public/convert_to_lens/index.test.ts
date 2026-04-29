/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToLens } from '.';
import { sampleAreaVis } from '../sample_vis.test.mocks';

const mockGetColumnsFromVis = jest.fn();
const mockCreateStaticValueColumn = jest.fn().mockReturnValue({ operationType: 'static_value' });
const mockGetVisSchemas = jest.fn().mockReturnValue({
  metric: [{ aggId: '1' }],
});
const mockGetConfiguration = jest.fn().mockReturnValue({});

jest.mock('../services', () => ({
  getDataViewsStart: jest.fn(() => ({ get: () => ({}), getDefault: () => ({}) })),
}));

jest.mock('../utils/get_series_params', () => ({
  getSeriesParams: jest.fn(() => undefined),
}));

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getConvertToLensModule: async () => ({
    getColumnsFromVis: jest.fn(() => mockGetColumnsFromVis()),
    createStaticValueColumn: jest.fn(() => mockCreateStaticValueColumn()),
  }),
  getDataViewByIndexPatternId: jest.fn(() => ({ id: 'index-pattern' })),
  getVisSchemas: jest.fn(() => mockGetVisSchemas()),
}));

jest.mock('./configurations', () => ({
  getConfiguration: jest.fn(() => mockGetConfiguration()),
}));

describe('convertToLens', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(sampleAreaVis as any, { getAbsoluteTime: () => {} } as any);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if  multi split series defined', async () => {
    mockGetVisSchemas.mockReturnValue({
      metric: [{ aggId: '1' }],
      group: [{}, {}],
    });
    const result = await convertToLens(sampleAreaVis as any, { getAbsoluteTime: () => {} } as any);
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if sibling pipeline agg defined together with split series', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['1'], customBuckets: { metric1: '2' } },
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ aggId: '1' }],
      group: [{}],
    });
    const result = await convertToLens(sampleAreaVis as any, { getAbsoluteTime: () => {} } as any);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if defined several layers with terms split series which uses one of the metrics as order agg', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['1'], customBuckets: { metric1: '2' } },
        columns: [{ isSplit: true, params: { orderBy: { type: 'column' } } }],
      },
      {
        buckets: { all: ['2'], customBuckets: { metric1: '2' } },
        columns: [{}],
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ aggId: '1' }, { aggId: '2' }],
    });
    const result = await convertToLens(sampleAreaVis as any, { getAbsoluteTime: () => {} } as any);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if more than one axis left/right/top/bottom defined', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['1'], customBuckets: {} },
        columns: [],
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ aggId: '1' }, { aggId: '2' }],
    });
    const result = await convertToLens(
      {
        ...sampleAreaVis,
        params: {
          ...sampleAreaVis.params,
          valueAxes: [
            ...sampleAreaVis.params.valueAxes,
            {
              id: 'ValueAxis-2',
              name: 'LeftAxis-2',
              type: 'value',
              position: 'left',
              data: {
                id: '2',
              },
            },
          ],
          seriesParams: [
            ...sampleAreaVis.params.seriesParams,
            { show: true, valueAxis: 'ValueAxis-2', data: { id: '2' } },
          ],
        },
      } as any,
      { getAbsoluteTime: () => {} } as any
    );
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should state for valid vis', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['2', '3'], customBuckets: { 1: '3' } },
        columns: [
          { columnId: '2', isBucketed: true },
          { columnId: '1', meta: { aggId: '1' } },
          { columnId: '3', isBucketed: true },
        ],
        bucketCollapseFn: { sum: ['3'] },
        metrics: ['1'],
      },
      {
        buckets: { all: ['2'], customBuckets: {} },
        columns: [
          { columnId: '2', isBucketed: true },
          { columnId: '1', meta: { aggId: '2' } },
        ],
        metrics: ['1'],
        bucketCollapseFn: {},
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ aggId: '1' }],
    });
    const result = await convertToLens(
      {
        ...sampleAreaVis,
        params: {
          ...sampleAreaVis.params,
          valueAxes: [
            ...sampleAreaVis.params.valueAxes,
            {
              id: 'ValueAxis-2',
              name: 'LeftAxis-2',
              type: 'value',
              position: 'left',
              data: {
                id: '2',
              },
            },
          ],
          seriesParams: [
            ...sampleAreaVis.params.seriesParams,
            { show: true, valueAxis: 'ValueAxis-2', data: { id: '2' } },
          ],
          thresholdLine: { ...sampleAreaVis.params.thresholdLine, show: true },
        },
      } as any,
      { getAbsoluteTime: () => {} } as any
    );
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(mockGetConfiguration).toBeCalledTimes(1);
    expect(mockCreateStaticValueColumn).toBeCalledTimes(1);
    expect(result?.type).toEqual('lnsXY');
    expect(result?.layers.length).toEqual(3);
    expect(result?.layers[0].columns).toEqual([
      { columnId: '2', isBucketed: true },
      { columnId: '1' },
      { columnId: '3', isBucketed: true },
    ]);
    expect(result?.layers[1].columns).toEqual([
      { columnId: '2', isBucketed: true },
      { columnId: '1' },
    ]);
    expect(result?.layers[2].columns).toEqual([{ operationType: 'static_value' }]);
  });
});
