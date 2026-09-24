/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { SOURCES_TYPES } from '@kbn/esql-types';
import type { UseAllSourcesParams } from './use_all_sources';
import { useAllSources } from './use_all_sources';
import type { ESQLSourceResult, EsqlDatasetsResult, EsqlViewsResult } from '@kbn/esql-types';

const mockIndex: ESQLSourceResult = { name: 'my-index', hidden: false, type: SOURCES_TYPES.INDEX };
const mockDataset: EsqlDatasetsResult = {
  datasets: [
    { name: 'ds-1', data_source: 'src-1', resource: 'r-1', description: 'A dataset' },
    { name: 'ds-2', data_source: 'src-2', resource: 'r-2' },
  ],
};
const mockViews: EsqlViewsResult = {
  views: [
    { name: 'view-1', query: 'FROM my-index', description: 'A view' },
    { name: 'view-2', query: 'FROM my-index | LIMIT 10' },
  ],
};

const makeParams = (overrides: Partial<Parameters<typeof useAllSources>[0]> = {}) => ({
  isOpen: true,
  isTimeseries: false,
  preloadedSources: undefined,
  getSources: jest.fn().mockResolvedValue([mockIndex]),
  getTimeseriesIndices: jest.fn().mockResolvedValue({ indices: [] }),
  getDatasets: jest.fn().mockResolvedValue(mockDataset),
  getViews: jest.fn().mockResolvedValue(mockViews),
  ...overrides,
});

describe('useAllSources', () => {
  it('merges datasets from getDatasets with regular sources', async () => {
    const params = makeParams();
    const { result } = renderHook(() => useAllSources(params));

    await waitFor(() => {
      const names = result.current.allSources.map((s) => s.name);
      expect(names).toEqual(expect.arrayContaining(['my-index', 'ds-1', 'ds-2']));
    });
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

    await waitFor(() =>
      expect(result.current.allSources.find((s) => s.name === 'ds-1')).toBeDefined()
    );

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

    // The views request still resolves, so its result proves the merge ran without datasets.
    await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('view-1'));

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

    await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('view-1'));

    const names = result.current.allSources.map((s) => s.name);
    expect(names).toContain('my-index');
    expect(names).not.toContain('ds-1');
  });

  describe('views', () => {
    it('merges views from getViews with regular sources', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() => {
        const names = result.current.allSources.map((s) => s.name);
        expect(names).toEqual(expect.arrayContaining(['my-index', 'view-1', 'view-2']));
      });
    });

    it('normalizes views with the VIEW type', async () => {
      const params = makeParams();
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() =>
        expect(result.current.allSources.find((s) => s.name === 'view-1')).toBeDefined()
      );

      expect(result.current.allSources.find((s) => s.name === 'view-1')).toEqual({
        name: 'view-1',
        title: 'view-1',
        type: SOURCES_TYPES.VIEW,
        hidden: false,
      });
    });

    it('keeps an enriched view type instead of the default VIEW type', async () => {
      const params = makeParams({
        getViews: jest.fn().mockResolvedValue({
          views: [{ name: 'view-1', query: 'FROM logs', type: SOURCES_TYPES.QUERY_STREAM }],
        }),
      });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() =>
        expect(result.current.allSources.find((s) => s.name === 'view-1')).toMatchObject({
          type: SOURCES_TYPES.QUERY_STREAM,
        })
      );
    });

    it('merges views when preloadedSources is provided', async () => {
      const params = makeParams({ preloadedSources: [mockIndex] });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() => {
        expect(result.current.allSources.map((s) => s.name)).toContain('view-1');
      });

      expect(result.current.allSources.map((s) => s.name)).toContain('my-index');
    });

    it('skips views for timeseries commands', async () => {
      const getViews = jest.fn().mockResolvedValue(mockViews);
      const params = makeParams({
        isTimeseries: true,
        getTimeseriesIndices: jest
          .fn()
          .mockResolvedValue({ indices: [{ name: 'ts-idx', mode: 'time_series', aliases: [] }] }),
        getViews,
      });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() => expect(result.current.isLoading).toBe(false));

      expect(getViews).not.toHaveBeenCalled();
      expect(result.current.allSources.map((s) => s.name)).not.toContain('view-1');
    });

    it('still returns regular sources when getViews rejects', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
      const params = makeParams({
        getViews: jest.fn().mockRejectedValue(new Error('Forbidden')),
      });
      const { result } = renderHook(() => useAllSources(params));

      // The datasets request still resolves, so its result proves the merge ran without views.
      await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('ds-1'));

      const names = result.current.allSources.map((s) => s.name);
      expect(names).toContain('my-index');
      expect(names).not.toContain('view-1');
      expect(consoleError).toHaveBeenCalled();
      consoleError.mockRestore();
    });

    it('tolerates a views response that carries no views array', async () => {
      const params = makeParams({ getViews: jest.fn().mockResolvedValue({}) });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() =>
        expect(result.current.allSources.map((s) => s.name)).toEqual(['my-index', 'ds-1', 'ds-2'])
      );
    });

    it('re-reads views when the browser is reopened, so new views show up', async () => {
      const getViews = jest
        .fn()
        .mockResolvedValueOnce(mockViews)
        .mockResolvedValueOnce({
          views: [...mockViews.views, { name: 'view-3', query: 'FROM a' }],
        });
      const params = makeParams({ getViews });
      const { result, rerender } = renderHook(
        (props: UseAllSourcesParams) => useAllSources(props),
        { initialProps: params }
      );

      await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('view-1'));
      expect(result.current.allSources.map((s) => s.name)).not.toContain('view-3');

      rerender({ ...params, isOpen: false });
      rerender(params);

      await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('view-3'));
    });

    it('keeps loading while views arrive for an empty base list', async () => {
      let resolveViews: (result: EsqlViewsResult) => void = () => {};
      const getViews = jest.fn(
        () =>
          new Promise<EsqlViewsResult>((resolve) => {
            resolveViews = resolve;
          })
      );
      const params = makeParams({ getSources: jest.fn().mockResolvedValue([]), getViews });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() => expect(getViews).toHaveBeenCalled());
      // Without this, the empty message would show over a list that is still filling.
      expect(result.current.isLoading).toBe(true);
      expect(result.current.allSources).toEqual([]);

      await act(async () => resolveViews(mockViews));

      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.allSources.map((s) => s.name)).toContain('view-1');
    });

    it('works without getViews provided', async () => {
      const params = makeParams({ getViews: undefined });
      const { result } = renderHook(() => useAllSources(params));

      await waitFor(() => expect(result.current.allSources.map((s) => s.name)).toContain('ds-1'));

      const names = result.current.allSources.map((s) => s.name);
      expect(names).toContain('my-index');
      expect(names).not.toContain('view-1');
    });
  });
});
