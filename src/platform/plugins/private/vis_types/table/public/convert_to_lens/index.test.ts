/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToLens } from '.';

const mockGetColumnsFromVis = jest.fn();
const mockGetPercentageColumnFormulaColumn = jest.fn();
const mockGetVisSchemas = jest.fn();
const mockGetConfiguration = jest.fn().mockReturnValue({});

jest.mock('../services', () => ({
  getDataViewsStart: jest.fn(() => ({ get: () => ({}), getDefault: () => ({}) })),
}));

jest.mock('@kbn/visualizations-plugin/public', () => ({
  getConvertToLensModule: async () => ({
    getColumnsFromVis: jest.fn(() => mockGetColumnsFromVis()),
    getPercentageColumnFormulaColumn: jest.fn(() => mockGetPercentageColumnFormulaColumn()),
  }),
  getVisSchemas: jest.fn(() => mockGetVisSchemas()),
  getDataViewByIndexPatternId: jest.fn(() => ({ id: 'index-pattern' })),
}));

jest.mock('./configurations', () => ({
  getConfiguration: jest.fn(() => mockGetConfiguration()),
}));

const vis = {
  isHierarchical: () => false,
  type: {},
  params: {
    perPage: 20,
    percentageCol: 'Count',
    showLabel: false,
    showMetricsAtAllLevels: true,
    showPartialRows: true,
    showTotal: true,
    showToolbar: false,
    totalFunc: 'sum',
  },
  data: {},
} as any;

const timefilter = {
  getAbsoluteTime: () => {},
} as any;

describe('convertToLens', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if can not build percentage column', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['2'] },
        columns: [{ columnId: '2' }, { columnId: '1' }],
        columnsWithoutReferenced: [
          { columnId: '1', meta: { aggId: 'agg-1' } },
          { columnId: '2', meta: { aggId: 'agg-2' } },
        ],
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ label: 'Count', aggId: 'agg-1' }],
    });
    mockGetPercentageColumnFormulaColumn.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockGetPercentageColumnFormulaColumn).toBeCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return correct state for valid vis', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['2'] },
        columns: [{ columnId: '2' }, { columnId: '1' }],
        columnsWithoutReferenced: [
          { columnId: '1', meta: { aggId: 'agg-1' } },
          { columnId: '2', meta: { aggId: 'agg-2' } },
        ],
      },
    ]);
    mockGetVisSchemas.mockReturnValue({
      metric: [{ label: 'Count', aggId: 'agg-1' }],
    });
    mockGetPercentageColumnFormulaColumn.mockReturnValue({ columnId: 'percentage-column-1' });
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toBeCalledTimes(1);
    expect(mockGetVisSchemas).toBeCalledTimes(1);
    expect(mockGetPercentageColumnFormulaColumn).toBeCalledTimes(1);
    expect(result?.type).toEqual('lnsDatatable');
    expect(result?.layers.length).toEqual(1);
    expect(result?.layers[0]).toEqual(
      expect.objectContaining({
        columnOrder: [],
        columns: [{ columnId: '2' }, { columnId: 'percentage-column-1' }, { columnId: '1' }],
      })
    );
  });
});
