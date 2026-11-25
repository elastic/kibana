/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { renderHook, waitFor } from '@testing-library/react';
import type { ESQLSearchResponse } from '@kbn/es-types';
import type { TraceSource } from '../types';
import {
  LATENCY_GRID_CACHE_MAX_AGE_MS,
  LATENCY_GRID_CACHE_SIZE,
  clearLatencyGridCaches,
} from './latency_grid_cache';
import { useLatencyGrid } from './use_latency_grid';

const source: TraceSource = {
  timeRange: { from: '2026-10-26T10:00:00.000Z', to: '2026-10-26T11:00:00.000Z' },
};
const statsTable = (spans: number): ESQLSearchResponse => ({
  columns: ['min', 'p90', 'p95', 'p99', 'max', 'spans'].map((name) => ({ name, type: 'long' })),
  values: [[100_000, 5_000_000, 8_000_000, 10_000_000, 2_000_000_000, spans]],
});
const gridTable = (values: number[][]): ESQLSearchResponse => ({
  columns: ['xi', 'yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
  values,
});
/** A runner answering the statistics query and the grid queries with the given tables. */
const createRunner = (stats: ESQLSearchResponse, grid: ESQLSearchResponse) =>
  jest.fn(async (query: string) => (query.includes('PERCENTILE') ? stats : grid));

describe('useLatencyGrid', () => {
  // Every test loads the same source: none may find the map of the one before it.
  beforeEach(clearLatencyGridCaches);

  it('loads the statistics, then the grid', async () => {
    const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
    const { result } = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(runEsql).toHaveBeenCalledTimes(2);
    expect(result.current.grid?.cells.size).toBe(1);
    expect(result.current.timeGrid?.bins).toBe(60);
    expect(result.current.sampling).toBeUndefined();
    expect(result.current.loadedSource).toEqual(source);
  });

  it('reports a range without spans as empty, without querying the grid', async () => {
    const runEsql = createRunner(statsTable(0), gridTable([]));
    const { result } = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isEmpty).toBe(true);
    expect(runEsql).toHaveBeenCalledTimes(1);
  });

  it('reads a range over the budget in two parts, the sampled one scaled up', async () => {
    const runEsql = jest.fn(async (query: string) => {
      if (query.includes('PERCENTILE')) return statsTable(2_000_000);
      return gridTable([[1, 2, query.includes('SAMPLE') ? 10 : 5, 0]]);
    });
    const { result } = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(runEsql).toHaveBeenCalledTimes(3);
    expect(result.current.sampling?.probability).toBe(0.25);
    // 5 exact, plus 10 sampled at 25%, each standing for 4: 45.
    expect([...result.current.grid!.cells.values()][0].spans).toBe(45);
  });

  it('reports the error of a query', async () => {
    const runEsql = jest.fn().mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
    await waitFor(() => expect(result.current.error?.message).toBe('boom'));
    expect(result.current.isLoading).toBe(false);
  });

  it('loads nothing until enabled, then loads', async () => {
    const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
    const { result, rerender } = renderHook(
      (props: { enabled: boolean }) =>
        useLatencyGrid({ source, runEsql, targetBins: 60, ...props }),
      { initialProps: { enabled: false } }
    );
    expect(runEsql).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(true);

    rerender({ enabled: true });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.grid?.cells.size).toBe(1);
  });

  it('reuses the statistics of the source when only the columns change', async () => {
    const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
    const { result, rerender } = renderHook(
      (props: { targetBins: number }) => useLatencyGrid({ source, runEsql, ...props }),
      { initialProps: { targetBins: 60 } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ targetBins: 120 });
    await waitFor(() => expect(result.current.timeGrid?.bins).toBe(120));
    // One statistics query in all: they do not depend on the columns.
    expect(runEsql.mock.calls.filter(([query]) => query.includes('PERCENTILE'))).toHaveLength(1);
    expect(runEsql).toHaveBeenCalledTimes(3);
  });

  it('shows a new source as loading, not as still empty', async () => {
    let empty = true;
    const runEsql = jest.fn(async (query: string) =>
      query.includes('PERCENTILE') ? statsTable(empty ? 0 : 100) : gridTable([[1, 2, 7, 3]])
    );
    const { result, rerender } = renderHook(
      (props: { source: TraceSource }) => useLatencyGrid({ ...props, runEsql, targetBins: 60 }),
      { initialProps: { source } }
    );
    await waitFor(() => expect(result.current.isEmpty).toBe(true));

    empty = false;
    const next = { timeRange: { from: source.timeRange.from, to: '2026-10-26T12:00:00.000Z' } };
    rerender({ source: next });
    expect(result.current.isEmpty).toBe(false);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.grid?.cells.size).toBe(1);
  });

  it('does not reload for an equal source in a new object', async () => {
    const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
    const { result, rerender } = renderHook(
      (props: { source: TraceSource }) => useLatencyGrid({ ...props, runEsql, targetBins: 60 }),
      { initialProps: { source } }
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    rerender({ source: JSON.parse(JSON.stringify(source)) });
    expect(runEsql).toHaveBeenCalledTimes(2);
  });

  describe('the cache', () => {
    it('serves a source loaded before at once after a remount, without a query or a loading state', async () => {
      const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
      const first = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      await waitFor(() => expect(first.result.current.isLoading).toBe(false));
      first.unmount();

      const again = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      expect(again.result.current.isLoading).toBe(false);
      expect(again.result.current.grid?.cells.size).toBe(1);
      expect(again.result.current.loadedSource).toEqual(source);
      expect(runEsql).toHaveBeenCalledTimes(2);
    });

    it('returns to the columns it loaded before without querying again', async () => {
      const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
      const { result, rerender } = renderHook(
        (props: { targetBins: number }) => useLatencyGrid({ source, runEsql, ...props }),
        { initialProps: { targetBins: 60 } }
      );
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      rerender({ targetBins: 120 });
      await waitFor(() => expect(result.current.timeGrid?.bins).toBe(120));
      rerender({ targetBins: 60 });
      expect(result.current.timeGrid?.bins).toBe(60);
      expect(result.current.isLoading).toBe(false);
      // Statistics once, then one grid per tier.
      expect(runEsql).toHaveBeenCalledTimes(3);
    });

    it('serves an empty range from the cache too', async () => {
      const runEsql = createRunner(statsTable(0), gridTable([]));
      const first = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      await waitFor(() => expect(first.result.current.isEmpty).toBe(true));
      first.unmount();
      const again = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      expect(again.result.current.isEmpty).toBe(true);
      expect(runEsql).toHaveBeenCalledTimes(1);
    });

    it('caches nothing of a failed load, so the next mount tries again', async () => {
      const runEsql = jest.fn().mockRejectedValue(new Error('boom'));
      const first = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      await waitFor(() => expect(first.result.current.error?.message).toBe('boom'));
      first.unmount();
      const again = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
      expect(again.result.current.isLoading).toBe(true);
      await waitFor(() => expect(again.result.current.error?.message).toBe('boom'));
      expect(runEsql).toHaveBeenCalledTimes(2);
    });

    it('caches nothing of a load that was cancelled, so a newer load is not overwritten', async () => {
      let resolveStats: (table: ESQLSearchResponse) => void = () => {};
      let calls = 0;
      const runEsql = jest.fn((query: string): Promise<ESQLSearchResponse> => {
        if (query.includes('PERCENTILE')) {
          calls += 1;
          // The first load's statistics hang; the second's answer at once.
          return calls === 1
            ? new Promise((resolve) => (resolveStats = resolve))
            : Promise.resolve(statsTable(100));
        }
        return Promise.resolve(gridTable([[1, 2, 7, 3]]));
      });
      const { result, rerender } = renderHook(
        (props: { targetBins: number }) => useLatencyGrid({ source, runEsql, ...props }),
        { initialProps: { targetBins: 60 } }
      );
      rerender({ targetBins: 120 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      // The cancelled first load answers now, with an empty range: it must not reach the cache.
      resolveStats(statsTable(0));
      await new Promise((resolve) => setTimeout(resolve, 0));
      rerender({ targetBins: 60 });
      await waitFor(() => expect(result.current.isLoading).toBe(false));
      expect(result.current.isEmpty).toBe(false);
      expect(result.current.grid?.cells.size).toBe(1);
    });

    it('forgets a map after a while, so late spans show on the next look', async () => {
      const now = jest.spyOn(Date, 'now');
      try {
        now.mockReturnValue(1_000_000);
        const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
        const first = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
        await waitFor(() => expect(first.result.current.isLoading).toBe(false));
        first.unmount();
        now.mockReturnValue(1_000_000 + LATENCY_GRID_CACHE_MAX_AGE_MS + 1);
        const again = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
        expect(again.result.current.isLoading).toBe(true);
        await waitFor(() => expect(again.result.current.isLoading).toBe(false));
        expect(runEsql).toHaveBeenCalledTimes(4);
      } finally {
        now.mockRestore();
      }
    });

    it('keeps the age of statistics it reuses, so a resize does not prolong them', async () => {
      const now = jest.spyOn(Date, 'now');
      try {
        now.mockReturnValue(1_000_000);
        const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
        const { result, rerender, unmount } = renderHook(
          (props: { targetBins: number }) => useLatencyGrid({ source, runEsql, ...props }),
          { initialProps: { targetBins: 60 } }
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        // Resized late in the statistics' life: they are reused, not written anew.
        now.mockReturnValue(1_000_000 + LATENCY_GRID_CACHE_MAX_AGE_MS - 1000);
        rerender({ targetBins: 120 });
        await waitFor(() => expect(result.current.timeGrid?.bins).toBe(120));
        unmount();
        // Past the age of the first load: its grid and its statistics are gone, the latter
        // despite the resize that reused them.
        now.mockReturnValue(1_000_000 + LATENCY_GRID_CACHE_MAX_AGE_MS + 1000);
        const again = renderHook(() => useLatencyGrid({ source, runEsql, targetBins: 60 }));
        await waitFor(() => expect(again.result.current.isLoading).toBe(false));
        // Statistics asked twice in all: once at first, once past their age.
        expect(runEsql.mock.calls.filter(([query]) => query.includes('PERCENTILE'))).toHaveLength(
          2
        );
      } finally {
        now.mockRestore();
      }
    });

    it('keeps the newest sources only', async () => {
      const runEsql = createRunner(statsTable(100), gridTable([[1, 2, 7, 3]]));
      const sources = Array.from({ length: LATENCY_GRID_CACHE_SIZE + 1 }, (_, i) => ({
        ...source,
        filters: [`i == ${i}`],
      }));
      for (const each of sources) {
        const { result, unmount } = renderHook(() =>
          useLatencyGrid({ source: each, runEsql, targetBins: 60 })
        );
        await waitFor(() => expect(result.current.isLoading).toBe(false));
        unmount();
      }
      const calls = runEsql.mock.calls.length;
      // The newest is still there; the oldest was dropped to make room, and loads again.
      const newest = renderHook(() =>
        useLatencyGrid({ source: sources[sources.length - 1], runEsql, targetBins: 60 })
      );
      expect(newest.result.current.isLoading).toBe(false);
      expect(runEsql).toHaveBeenCalledTimes(calls);
      const oldest = renderHook(() =>
        useLatencyGrid({ source: sources[0], runEsql, targetBins: 60 })
      );
      expect(oldest.result.current.isLoading).toBe(true);
      await waitFor(() => expect(oldest.result.current.isLoading).toBe(false));
      expect(runEsql.mock.calls.length).toBeGreaterThan(calls);
    });
  });

  describe('with the operations feature', () => {
    const operationsTable: ESQLSearchResponse = {
      columns: [
        { name: 'service.name', type: 'keyword' },
        { name: 'operation', type: 'keyword' },
        ...['yi', 'spans', 'failed'].map((name) => ({ name, type: 'long' })),
      ],
      values: [['cart', 'GET /cart', 5, 40, 10]],
    } as ESQLSearchResponse;
    const isOperationsQuery = (query: string) => query.includes('BY service.name, operation, yi');
    const createOperationsRunner = () =>
      jest.fn(async (query: string) => {
        if (query.includes('PERCENTILE')) return statsTable(100);
        if (isOperationsQuery(query)) return operationsTable;
        return gridTable([[1, 2, 7, 3]]);
      });

    it('starts the histograms beside the grid query, not behind it', async () => {
      let releaseGrid: (table: ESQLSearchResponse) => void = () => {};
      const kinds: string[] = [];
      const runEsql = jest.fn((query: string): Promise<ESQLSearchResponse> => {
        if (query.includes('PERCENTILE')) return Promise.resolve(statsTable(100));
        if (isOperationsQuery(query)) {
          kinds.push('operations');
          return Promise.resolve(operationsTable);
        }
        kinds.push('grid');
        return new Promise((resolve) => (releaseGrid = resolve));
      });
      const { result } = renderHook(() =>
        useLatencyGrid({ source, runEsql, targetBins: 60, loadOperations: true })
      );
      // The histogram query is asked while the grid query is still in flight.
      await waitFor(() => expect([...kinds].sort()).toEqual(['grid', 'operations']));
      expect(result.current.grid).toBeUndefined();
      releaseGrid(gridTable([[1, 2, 7, 3]]));
      await waitFor(() => expect(result.current.operations).toHaveLength(1));
    });

    it('loads the histograms after the grid, and not at all without the feature', async () => {
      const runEsql = createOperationsRunner();
      const { result } = renderHook(() =>
        useLatencyGrid({ source, runEsql, targetBins: 60, loadOperations: true })
      );
      await waitFor(() => expect(result.current.operations).toBeDefined());
      expect(result.current.operations).toHaveLength(1);
      expect(result.current.operations?.[0].operation).toEqual({
        service: 'cart',
        name: 'GET /cart',
      });
      expect(runEsql).toHaveBeenCalledTimes(3);

      const withoutFeature = createOperationsRunner();
      const { result: plain } = renderHook(() =>
        useLatencyGrid({ source, runEsql: withoutFeature, targetBins: 60 })
      );
      await waitFor(() => expect(plain.current.isLoading).toBe(false));
      expect(withoutFeature.mock.calls.some(([query]) => isOperationsQuery(query))).toBe(false);
    });

    it('loads the histograms again with fresh statistics, which bin the rows anew', async () => {
      const now = jest.spyOn(Date, 'now');
      try {
        now.mockReturnValue(1_000_000);
        let spans = 100;
        const runEsql = jest.fn(async (query: string) => {
          if (query.includes('PERCENTILE')) return statsTable(spans);
          if (isOperationsQuery(query)) return operationsTable;
          return gridTable([[1, 2, 7, 3]]);
        });
        const first = renderHook(() =>
          useLatencyGrid({ source, runEsql, targetBins: 60, loadOperations: true })
        );
        await waitFor(() => expect(first.result.current.operations).toHaveLength(1));
        first.unmount();
        // Past the statistics' age the range has more spans, and other percentiles.
        now.mockReturnValue(1_000_000 + LATENCY_GRID_CACHE_MAX_AGE_MS + 1000);
        spans = 500;
        const again = renderHook(() =>
          useLatencyGrid({ source, runEsql, targetBins: 60, loadOperations: true })
        );
        await waitFor(() => expect(again.result.current.operations).toHaveLength(1));
        expect(runEsql.mock.calls.filter(([query]) => isOperationsQuery(query))).toHaveLength(2);
      } finally {
        now.mockRestore();
      }
    });

    it('keeps the histograms of the source when only the columns change', async () => {
      const runEsql = createOperationsRunner();
      const { result, rerender } = renderHook(
        (props: { targetBins: number }) =>
          useLatencyGrid({ source, runEsql, loadOperations: true, ...props }),
        { initialProps: { targetBins: 60 } }
      );
      await waitFor(() => expect(result.current.operations).toBeDefined());

      rerender({ targetBins: 120 });
      await waitFor(() => expect(result.current.timeGrid?.bins).toBe(120));
      await waitFor(() => expect(result.current.operations).toBeDefined());
      expect(runEsql.mock.calls.filter(([query]) => isOperationsQuery(query))).toHaveLength(1);
    });

    it('only loses the bands when the histogram query fails, and retries on the next load', async () => {
      let failures = 0;
      const runEsql = jest.fn(async (query: string) => {
        if (query.includes('PERCENTILE')) return statsTable(100);
        if (isOperationsQuery(query)) {
          if (failures++ === 0) throw new Error('boom');
          return operationsTable;
        }
        return gridTable([[1, 2, 7, 3]]);
      });
      const { result, rerender } = renderHook(
        (props: { targetBins: number }) =>
          useLatencyGrid({ source, runEsql, loadOperations: true, ...props }),
        { initialProps: { targetBins: 60 } }
      );
      await waitFor(() => expect(result.current.operations).toEqual([]));
      expect(result.current.grid?.cells.size).toBe(1);
      expect(result.current.error).toBeUndefined();

      // A transient failure is not cached as "no bands": the next load asks again.
      rerender({ targetBins: 120 });
      await waitFor(() => expect(result.current.operations).toHaveLength(1));
    });
  });

  it('drops the answer of a source that was replaced', async () => {
    let releaseFirst: (table: ESQLSearchResponse) => void = () => {};
    let statsCalls = 0;
    const runEsql = jest.fn((query: string): Promise<ESQLSearchResponse> => {
      if (!query.includes('PERCENTILE')) return Promise.resolve(gridTable([[1, 2, 7, 3]]));
      // The first source never answers until released, after it was replaced.
      return ++statsCalls === 1
        ? new Promise<ESQLSearchResponse>((resolve) => (releaseFirst = resolve))
        : Promise.resolve(statsTable(100));
    });
    const { result, rerender } = renderHook(
      (props: { source: TraceSource }) => useLatencyGrid({ ...props, runEsql, targetBins: 60 }),
      { initialProps: { source } }
    );
    const next = { timeRange: { from: source.timeRange.from, to: '2026-10-26T12:00:00.000Z' } };
    rerender({ source: next });
    await waitFor(() => expect(result.current.loadedSource).toEqual(next));

    releaseFirst(statsTable(100));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(result.current.loadedSource).toEqual(next);
  });
});
