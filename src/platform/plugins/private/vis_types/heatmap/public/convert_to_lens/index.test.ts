/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ColorSchemas } from '@kbn/charts-plugin/common';
import { Vis } from '@kbn/visualizations-plugin/public';
import { convertToLens } from '.';
import { HeatmapVisParams } from '../types';

const mockGetColumnsFromVis = jest.fn();
const mockGetConfiguration = jest.fn().mockReturnValue({});
const mockGetDataViewByIndexPatternId = jest.fn();
const mockConvertToFiltersColumn = jest.fn();

jest.mock('../services', () => ({
  getDataViewsStart: jest.fn(() => ({ get: () => ({}), getDefault: () => ({}) })),
}));

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getConvertToLensModule: async () => ({
    getColumnsFromVis: jest.fn(() => mockGetColumnsFromVis()),
    convertToFiltersColumn: jest.fn(() => mockConvertToFiltersColumn()),
  }),
  getDataViewByIndexPatternId: jest.fn(() => mockGetDataViewByIndexPatternId()),
}));

jest.mock('./configurations', () => ({
  getConfiguration: jest.fn(() => mockGetConfiguration()),
}));

const params: HeatmapVisParams = {
  addTooltip: false,
  addLegend: false,
  enableHover: true,
  legendPosition: 'bottom',
  lastRangeIsRightOpen: false,
  percentageMode: false,
  valueAxes: [],
  colorSchema: ColorSchemas.Blues,
  invertColors: false,
  colorsNumber: 4,
  setColorRange: true,
};

const vis = {
  isHierarchical: () => false,
  type: {},
  params,
  data: {},
} as unknown as Vis<HeatmapVisParams>;

const timefilter = {
  getAbsoluteTime: () => {},
} as any;

describe('convertToLens', () => {
  beforeEach(() => {
    mockGetDataViewByIndexPatternId.mockReturnValue({ id: 'index-pattern' });
    mockConvertToFiltersColumn.mockReturnValue({ columnId: 'column-id-1' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null if timefilter is undefined', async () => {
    const result = await convertToLens(vis);
    expect(result).toBeNull();
  });

  test('should return null if mockGetDataViewByIndexPatternId returns null', async () => {
    mockGetDataViewByIndexPatternId.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetDataViewByIndexPatternId).toBeCalledTimes(1);
    expect(mockGetColumnsFromVis).toBeCalledTimes(0);
    expect(result).toBeNull();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if metrics count is more than 1', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1', '2'],
        buckets: { all: [] },
        columns: [{ columnId: '2' }, { columnId: '1' }],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return empty filters for x-axis if no buckets are specified', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1'],
        buckets: { all: [] },
        columns: [{ columnId: '1', dataType: 'number' }],
        columnsWithoutReferenced: [
          { columnId: '1', meta: { aggId: 'agg-1' } },
          { columnId: '2', meta: { aggId: 'agg-2' } },
          { columnId: 'column-id-1' },
        ],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toEqual(
      expect.objectContaining({
        configuration: {},
        indexPatternIds: ['index-pattern'],
        layers: [
          expect.objectContaining({
            columnOrder: [],
            columns: [{ columnId: '1', dataType: 'number' }, { columnId: 'column-id-1' }],
            indexPatternId: 'index-pattern',
          }),
        ],
        type: 'lnsHeatmap',
      })
    );
  });

  test('should return correct state for valid vis', async () => {
    const config = {
      layerType: 'data',
    };

    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1'],
        buckets: { all: ['2'] },
        columns: [{ columnId: '1', dataType: 'number' }],
        columnsWithoutReferenced: [
          { columnId: '1', meta: { aggId: 'agg-1' } },
          { columnId: '2', meta: { aggId: 'agg-2' } },
        ],
      },
    ]);
    mockGetConfiguration.mockReturnValue(config);

    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(mockGetConfiguration).toBeCalledTimes(1);
    expect(result?.type).toEqual('lnsHeatmap');
    expect(result?.layers.length).toEqual(1);
    expect(result?.layers[0]).toEqual(
      expect.objectContaining({
        columnOrder: [],
        columns: [{ columnId: '1', dataType: 'number' }, { columnId: 'column-id-1' }],
        indexPatternId: 'index-pattern',
      })
    );
    expect(result?.configuration).toEqual(config);
  });
});
