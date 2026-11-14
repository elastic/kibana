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

    it('only loses the bands when the histogram query fails, never the grid', async () => {
      const runEsql = jest.fn(async (query: string) => {
        if (query.includes('PERCENTILE')) return statsTable(100);
        if (isOperationsQuery(query)) throw new Error('boom');
        return gridTable([[1, 2, 7, 3]]);
      });
      const { result } = renderHook(() =>
        useLatencyGrid({ source, runEsql, targetBins: 60, loadOperations: true })
      );
      await waitFor(() => expect(result.current.operations).toEqual([]));
      expect(result.current.grid?.cells.size).toBe(1);
      expect(result.current.error).toBeUndefined();
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
