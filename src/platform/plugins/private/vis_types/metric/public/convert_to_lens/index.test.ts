/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { ColorSchemas } from '@kbn/charts-plugin/common';
import type { Vis } from '@kbn/visualizations-plugin/public';
import { convertToLens } from '.';
import type { VisParams } from '../types';

const mockGetColumnsFromVis = vi.fn();
const mockGetPercentageColumnFormulaColumn = vi.fn();
const mockGetConfiguration = vi.fn().mockReturnValue({});
const mockGetPercentageModeConfig = vi.fn();
const mockGetPalette = vi.fn();

vi.mock('../services', () => {
      const mocked = {
      getDataViewsStart: vi.fn(() => ({ get: () => ({}), getDefault: () => ({}) })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('@kbn/visualizations-plugin/public', () => {
      const mocked = {
      getConvertToLensModule: async () => ({
        getColumnsFromVis: vi.fn(() => mockGetColumnsFromVis()),
        getPercentageColumnFormulaColumn: vi.fn(() => mockGetPercentageColumnFormulaColumn()),
        getPercentageModeConfig: vi.fn(() => mockGetPercentageModeConfig()),
        getPalette: vi.fn(() => mockGetPalette()),
      }),
      getDataViewByIndexPatternId: vi.fn(() => ({ id: 'index-pattern' })),
    };
      return { ...mocked, default: mocked };
    });

vi.mock('./configurations', () => {
      const mocked = {
      getConfiguration: vi.fn(() => mockGetConfiguration()),
    };
      return { ...mocked, default: mocked };
    });

const params: VisParams = {
  addTooltip: false,
  addLegend: false,
  dimensions: {} as VisParams['dimensions'],
  metric: {
    percentageMode: false,
    percentageFormatPattern: '',
    useRanges: false,
    colorSchema: ColorSchemas.Greys,
    metricColorMode: 'None',
    colorsRange: [],
    labels: {},
    invertColors: false,
    style: {
      bgFill: '',
      bgColor: false,
      labelColor: false,
      subText: '',
      fontSize: 10,
    },
  },
  type: 'metric',
};

const vis = {
  isHierarchical: () => false,
  type: {},
  params,
  data: {},
} as unknown as Vis<VisParams>;

const timefilter = {
  getAbsoluteTime: () => {},
} as any;

describe('convertToLens', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if metrics count is more than 1', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1', '2'],
        columns: [{ columnId: '2' }, { columnId: '1' }],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
  test('should return null if buckets count is more than 1', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: [],
        buckets: { all: ['1', '2'] },
        columns: [{ columnId: '2' }, { columnId: '1' }],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if metric column data type is different from number', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1'],
        buckets: { all: ['2'] },
        columns: [{ columnId: '2' }, { columnId: '1', dataType: 'string' }],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });
  test('should return correct state for valid vis', async () => {
    const config = {
      layerType: 'data',
      metricAccessor: '1',
    };

    mockGetColumnsFromVis.mockReturnValue([
      {
        metrics: ['1'],
        buckets: { all: ['2'] },
        columns: [{ columnId: '2' }, { columnId: '1', dataType: 'number' }],
        columnsWithoutReferenced: [
          { columnId: '1', meta: { aggId: 'agg-1' } },
          { columnId: '2', meta: { aggId: 'agg-2' } },
        ],
      },
    ]);
    mockGetConfiguration.mockReturnValue(config);

    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(mockGetConfiguration).toHaveBeenCalledTimes(1);
    expect(mockGetPalette).toHaveBeenCalledTimes(1);
    expect(result?.type).toEqual('lnsMetric');
    expect(result?.layers.length).toEqual(1);
    expect(result?.layers[0]).toEqual(
      expect.objectContaining({
        columnOrder: [],
        columns: [{ columnId: '2' }, { columnId: '1', dataType: 'number' }],
      })
    );
    expect(result?.configuration).toEqual(config);
  });
});
