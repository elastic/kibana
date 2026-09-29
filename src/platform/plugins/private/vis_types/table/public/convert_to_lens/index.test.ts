/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { vi } from 'vitest';

import { convertToLens } from '.';

const mockGetColumnsFromVis = vi.fn();
const mockGetPercentageColumnFormulaColumn = vi.fn();
const mockGetVisSchemas = vi.fn();
const mockGetConfiguration = vi.fn().mockReturnValue({});

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
    }),
    getVisSchemas: vi.fn(() => mockGetVisSchemas()),
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
    vi.clearAllMocks();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(vis, timefilter);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
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
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockGetPercentageColumnFormulaColumn).toHaveBeenCalledTimes(1);
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
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(mockGetVisSchemas).toHaveBeenCalledTimes(1);
    expect(mockGetPercentageColumnFormulaColumn).toHaveBeenCalledTimes(1);
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
