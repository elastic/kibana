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
import { convertToLens } from './goal';
import { GaugeVisParams } from '../types';

const mockGetColumnsFromVis = jest.fn();
const mockGetPercentageColumnFormulaColumn = jest.fn();
const mockGetConfiguration = jest.fn().mockReturnValue({});
const mockGetPercentageModeConfig = jest.fn();
const mockGetPalette = jest.fn();
const mockCreateStaticValueColumn = jest.fn();

jest.mock('../services', () => ({
  getDataViewsStart: jest.fn(() => ({ get: () => ({}), getDefault: () => ({}) })),
}));

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getConvertToLensModule: async () => ({
    getColumnsFromVis: jest.fn(() => mockGetColumnsFromVis()),
    getPercentageColumnFormulaColumn: jest.fn(() => mockGetPercentageColumnFormulaColumn()),
    getPercentageModeConfig: jest.fn(() => mockGetPercentageModeConfig()),
    getPalette: jest.fn(() => mockGetPalette()),
    createStaticValueColumn: jest.fn(() => mockCreateStaticValueColumn()),
  }),
  getDataViewByIndexPatternId: jest.fn(() => ({ id: 'index-pattern' })),
}));

jest.mock('./configurations/goal', () => ({
  getConfiguration: jest.fn(() => mockGetConfiguration()),
}));

const params: GaugeVisParams = {
  addTooltip: false,
  addLegend: false,
  isDisplayWarning: true,
  gauge: {
    type: 'meter',
    orientation: 'vertical',
    alignment: 'automatic',
    gaugeType: 'Arc',
    scale: {
      color: 'rgba(105,112,125,0.2)',
      labels: false,
      show: false,
    },
    gaugeStyle: 'Full',
    extendRange: false,
    backStyle: 'Full',
    percentageMode: false,
    percentageFormatPattern: '',
    colorSchema: ColorSchemas.Greys,
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
  type: 'gauge',
};

const vis = {
  isHierarchical: () => false,
  type: {},
  params,
  data: {},
} as unknown as Vis<GaugeVisParams>;

const timefilter = {
  getAbsoluteTime: () => {},
} as any;

describe('convertToLens', () => {
  beforeEach(() => {
    mockGetPercentageModeConfig.mockReturnValue({
      isPercentageMode: false,
      min: 0,
      max: 100,
    });
    mockCreateStaticValueColumn.mockReturnValue({});
  });

  afterEach(() => {
    jest.clearAllMocks();
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
        columns: [{ columnId: '2' }, { columnId: '1' }],
      },
    ]);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
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
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
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
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
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
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(mockGetConfiguration).toBeCalledTimes(1);
    expect(mockGetPalette).toBeCalledTimes(1);
    expect(result?.type).toEqual('lnsMetric');
    expect(result?.layers.length).toEqual(1);
    expect(result?.layers[0]).toEqual(
      expect.objectContaining({
        columnOrder: [],
        columns: [{ columnId: '2' }, { columnId: '1', dataType: 'number' }, {}],
        indexPatternId: 'index-pattern',
      })
    );
    expect(result?.configuration).toEqual(config);
  });
});
