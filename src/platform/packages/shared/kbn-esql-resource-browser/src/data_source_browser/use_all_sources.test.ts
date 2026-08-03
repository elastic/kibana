/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import { SOURCES_TYPES } from '@kbn/esql-types';
import { useAllSources } from './use_all_sources';
import type { ESQLSourceResult, EsqlDatasetsResult } from '@kbn/esql-types';

const mockIndex: ESQLSourceResult = { name: 'my-index', hidden: false, type: SOURCES_TYPES.INDEX };
const mockDataset: EsqlDatasetsResult = {
  datasets: [
    { name: 'ds-1', data_source: 'src-1', resource: 'r-1', description: 'A dataset' },
    { name: 'ds-2', data_source: 'src-2', resource: 'r-2' },
  ],
};

const makeParams = (overrides: Partial<Parameters<typeof useAllSources>[0]> = {}) => ({
  isOpen: true,
  isTimeseries: false,
  preloadedSources: undefined,
  getSources: jest.fn().mockResolvedValue([mockIndex]),
  getTimeseriesIndices: jest.fn().mockResolvedValue({ indices: [] }),
  getDatasets: jest.fn().mockResolvedValue(mockDataset),
  ...overrides,
});

describe('useAllSources', () => {
  it('merges datasets from getDatasets with regular sources', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const names = result.current.allSources.map((s) => s.name);
    expect(names).toContain('my-index');
    expect(names).toContain('ds-1');
    expect(names).toContain('ds-2');
  });

  it('keeps the regular source when a dataset shares its name', async () => {
    const params = makeParams({
      getDatasets: jest.fn().mockResolvedValue({
        datasets: [
          { name: 'my-index', data_source: 'src-1', resource: 'r-1', description: 'A dataset' },
        ],
      }),
    });
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const matches = result.current.allSources.filter((s) => s.name === 'my-index');
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ name: 'my-index', type: SOURCES_TYPES.INDEX });
  });

  it('normalizes datasets with EXTERNAL type', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const ds1 = result.current.allSources.find((s) => s.name === 'ds-1');
    expect(ds1).toMatchObject({
      name: 'ds-1',
      type: SOURCES_TYPES.EXTERNAL,
      hidden: false,
      description: 'A dataset',
    });
  });

  it('merges datasets when preloadedSources is provided', async () => {
    const params = makeParams({ preloadedSources: [mockIndex] });
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => {
      const names = result.current.allSources.map((s) => s.name);
      return names.includes('ds-1');
    });

    const names = result.current.allSources.map((s) => s.name);
    expect(names).toContain('my-index');
    expect(names).toContain('ds-1');
  });

  it('skips datasets for timeseries commands', async () => {
    const getDatasets = jest.fn().mockResolvedValue(mockDataset);
    const params = makeParams({
      isTimeseries: true,
      getTimeseriesIndices: jest
        .fn()
        .mockResolvedValue({ indices: [{ name: 'ts-idx', mode: 'time_series', aliases: [] }] }),
      getDatasets,
    });
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(getDatasets).not.toHaveBeenCalled();
    const names = result.current.allSources.map((s) => s.name);
    expect(names).not.toContain('ds-1');
    expect(names).toContain('ts-idx');
  });

  it('still returns regular sources when getDatasets rejects', async () => {
    const params = makeParams({
      getDatasets: jest.fn().mockRejectedValue(new Error('network error')),
    });
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const names = result.current.allSources.map((s) => s.name);
    expect(names).toContain('my-index');
    expect(names).not.toContain('ds-1');
  });

  it('returns nothing when browser is closed', () => {
    const params = makeParams({ isOpen: false });
    const { result } = renderHook(() => useAllSources(params));

    expect(result.current.allSources).toEqual([]);
    expect(params.getSources).not.toHaveBeenCalled();
  });

  it('works without getDatasets provided', async () => {
    const params = makeParams({ getDatasets: undefined });
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const names = result.current.allSources.map((s) => s.name);
    expect(names).toContain('my-index');
    expect(names).not.toContain('ds-1');
  });
});
