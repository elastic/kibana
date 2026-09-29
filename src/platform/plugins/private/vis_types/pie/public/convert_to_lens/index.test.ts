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
import { samplePieVis } from '../sample_vis.test.mocks';

const mockGetColumnsFromVis = vi.fn();
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

describe('convertToLens', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  test('should return null if getColumnsFromVis returns null', async () => {
    mockGetColumnsFromVis.mockReturnValue(null);
    const result = await convertToLens(samplePieVis as any, {} as any);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if more than three split slice levels', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['1', '2', '3', '4'] },
      },
    ]);
    const result = await convertToLens(samplePieVis as any, {} as any);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should return null if no one split slices', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: [] },
      },
    ]);
    const result = await convertToLens(samplePieVis as any, {} as any);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(result).toBeNull();
  });

  test('should state for valid vis', async () => {
    mockGetColumnsFromVis.mockReturnValue([
      {
        buckets: { all: ['2'] },
        columns: [{ columnId: '2' }, { columnId: '1' }],
      },
    ]);
    const result = await convertToLens(samplePieVis as any, {} as any);
    expect(mockGetColumnsFromVis).toHaveBeenCalledTimes(1);
    expect(mockGetConfiguration).toHaveBeenCalledTimes(1);
    expect(result?.type).toEqual('lnsPie');
    expect(result?.layers.length).toEqual(1);
    expect(result?.layers[0]).toEqual(
      expect.objectContaining({
        columnOrder: [],
        columns: [{ columnId: '2' }, { columnId: '1' }],
      })
    );
  });
});
