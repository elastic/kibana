/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Datatable } from '@kbn/expressions-plugin/common';
import type { DataPublicPluginStart } from '@kbn/data-plugin/public';
import { getTime } from '@kbn/data-plugin/public';
import type { UnifiedChangePointGridProps } from '@kbn/change-point-chart-viewer';
import {
  appendDistinctEntityWhereToLineEsql,
  clearChangePointSummarySeriesCache,
  ENTITY_WHERE_PREDICATE_CAP,
  getChangePointSummarySeries$,
  getEarliestAnnotationTime,
  getEntityColumnIds,
  getSeriesCacheKey,
  getSummarySeriesTimeRange,
  partitionLineRows,
  type ChangePointSummarySeriesState,
} from './change_point_summary_series';

jest.mock('@kbn/data-plugin/public', () => {
  const actual = jest.requireActual('@kbn/data-plugin/public');
  return {
    ...actual,
    getTime: jest.fn(() => undefined),
  };
});

type ChangePointFetchParams = UnifiedChangePointGridProps['fetchParams'];

const makeTable = (columns: Datatable['columns'], rows: Datatable['rows']): Datatable => ({
  type: 'datatable',
  columns,
  rows,
});

const ESQL_NO_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket';

const ESQL_WITH_HOST_BY =
  'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket BY host';

const COLUMNS_NO_BY = [
  { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
  { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
  { id: 'type', name: 'type', meta: { type: 'string' as const } },
  { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
];

const COLUMNS_WITH_HOST = [
  { id: 'host', name: 'host', meta: { type: 'string' as const } },
  { id: 'bucket', name: 'bucket', meta: { type: 'date' as const } },
  { id: 'avg_bytes', name: 'avg_bytes', meta: { type: 'number' as const } },
  { id: 'type', name: 'type', meta: { type: 'string' as const } },
  { id: 'pvalue', name: 'pvalue', meta: { type: 'number' as const } },
];

describe('change_point_summary_series pure helpers', () => {
  describe('getEntityColumnIds', () => {
    it('returns BY columns that exist on the table', () => {
      expect(getEntityColumnIds(ESQL_NO_BY, makeTable(COLUMNS_NO_BY, []))).toEqual([]);
      expect(getEntityColumnIds(ESQL_WITH_HOST_BY, makeTable(COLUMNS_WITH_HOST, []))).toEqual([
        'host',
      ]);
      expect(getEntityColumnIds(ESQL_WITH_HOST_BY, makeTable(COLUMNS_NO_BY, []))).toEqual([]);
    });
  });

  describe('getEarliestAnnotationTime / getSummarySeriesTimeRange', () => {
    const inRangeTable = makeTable(COLUMNS_NO_BY, [
      { bucket: '2023-11-14T00:00:00.000Z', avg_bytes: 12, type: '', pvalue: null },
      { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14, type: 'mean_shift', pvalue: 0.001 },
    ]);

    it('finds the earliest typed change-point annotation', () => {
      expect(getEarliestAnnotationTime(inRangeTable, 'bucket', ESQL_NO_BY)).toBe(
        Date.parse('2023-11-15T00:00:00.000Z')
      );
    });

    it('extends from when the annotation is before Discover from', () => {
      const range = getSummarySeriesTimeRange(
        { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
        Date.parse('2023-11-10T00:00:00.000Z')
      );
      expect(range).toEqual({
        from: '2023-11-10T00:00:00.000Z',
        to: '2023-11-20T00:00:00.000Z',
      });
    });

    it('does not extend from when the annotation is inside the range', () => {
      const timeRange = { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' };
      expect(getSummarySeriesTimeRange(timeRange, Date.parse('2023-11-15T00:00:00.000Z'))).toEqual(
        timeRange
      );
    });
  });

  describe('partitionLineRows', () => {
    it('builds a single series with empty entity key when there is no BY', () => {
      const series = partitionLineRows(
        [
          { bucket: '2023-11-14T00:00:00.000Z', avg_bytes: 12 },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
        ],
        'bucket',
        'avg_bytes',
        []
      );

      expect([...series.keys()]).toEqual(['']);
      expect(series.get('')).toEqual([
        { x: Date.parse('2023-11-14T00:00:00.000Z'), y: 12 },
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 },
      ]);
    });

    it('partitions and sorts points per entity key', () => {
      const series = partitionLineRows(
        [
          { host: 'b', bucket: '2023-11-16T00:00:00.000Z', avg_bytes: 20 },
          { host: 'a', bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
          { host: 'a', bucket: '2023-11-14T00:00:00.000Z', avg_bytes: 12 },
          { host: 'b', bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 18 },
        ],
        'bucket',
        'avg_bytes',
        ['host']
      );

      expect(series.get('host=a')).toEqual([
        { x: Date.parse('2023-11-14T00:00:00.000Z'), y: 12 },
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 },
      ]);
      expect(series.get('host=b')).toEqual([
        { x: Date.parse('2023-11-15T00:00:00.000Z'), y: 18 },
        { x: Date.parse('2023-11-16T00:00:00.000Z'), y: 20 },
      ]);
    });

    it('skips rows with invalid time or non-numeric values', () => {
      const series = partitionLineRows(
        [
          { bucket: 'not-a-date', avg_bytes: 12 },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 'nope' },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: null },
          { bucket: '2023-11-15T00:00:00.000Z', avg_bytes: 14 },
        ],
        'bucket',
        'avg_bytes',
        []
      );

      expect(series.get('')).toEqual([{ x: Date.parse('2023-11-15T00:00:00.000Z'), y: 14 }]);
    });
  });

  describe('appendDistinctEntityWhereToLineEsql', () => {
    const line = 'FROM idx | STATS avg_bytes = AVG(bytes) BY host, bucket';

    it('appends OR predicates for distinct entity values', () => {
      expect(
        appendDistinctEntityWhereToLineEsql(
          line,
          [{ host: 'a' }, { host: 'a' }, { host: 'b' }],
          ['host']
        )
      ).toBe(`${line} | WHERE host == "a" OR host == "b"`);
    });

    it('groups multi-column entities', () => {
      expect(
        appendDistinctEntityWhereToLineEsql(
          line,
          [{ host: 'a', service: 'orders' }],
          ['host', 'service']
        )
      ).toBe(`${line} | WHERE (host == "a" AND service == "orders")`);
    });

    it('returns the original query when the distinct set exceeds the cap', () => {
      const rows = Array.from({ length: ENTITY_WHERE_PREDICATE_CAP + 1 }, (_, i) => ({
        host: `h${i}`,
      }));
      expect(appendDistinctEntityWhereToLineEsql(line, rows, ['host'])).toBe(line);
    });
  });

  describe('getSeriesCacheKey', () => {
    it('changes when time range or filters change', () => {
      const table = makeTable(COLUMNS_NO_BY, []);
      const base = {
        searchSessionId: 's',
        lastReloadRequestTime: 1,
        query: { esql: ESQL_NO_BY },
        table,
        filters: [],
        timeRange: { from: 'now-1d', to: 'now' },
      } as unknown as ChangePointFetchParams;

      const same = getSeriesCacheKey(base);
      expect(getSeriesCacheKey({ ...base })).toBe(same);
      expect(
        getSeriesCacheKey({
          ...base,
          timeRange: { from: 'now-2d', to: 'now' },
        })
      ).not.toBe(same);
      expect(
        getSeriesCacheKey({
          ...base,
          filters: [{ meta: { key: 'host' } }] as never,
        })
      ).not.toBe(same);
    });
  });

  describe('getChangePointSummarySeries$', () => {
    beforeEach(() => {
      clearChangePointSummarySeriesCache();
      jest.mocked(getTime).mockClear();
      jest.mocked(getTime).mockReturnValue(undefined);
    });

    const waitForTerminalState = (
      fetchParams: ChangePointFetchParams,
      data: DataPublicPluginStart
    ): Promise<ChangePointSummarySeriesState> =>
      new Promise((resolve, reject) => {
        getChangePointSummarySeries$(fetchParams, data).subscribe({
          next: (s) => {
            if (s.status === 'ready' || s.status === 'error' || s.status === 'idle') {
              resolve(s);
            }
          },
          error: reject,
        });
      });

    const makeFetchParams = (
      overrides: Partial<ChangePointFetchParams> & {
        table: Datatable;
        query: { esql: string };
      }
    ): ChangePointFetchParams =>
      ({
        searchSessionId: 'session-1',
        lastReloadRequestTime: 1,
        dataView: { isTimeBased: () => false } as never,
        filters: [],
        timeRange: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
        ...overrides,
      } as ChangePointFetchParams);

    it('stays idle when the table is missing', async () => {
      const esql = jest.fn();
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const idle = await waitForTerminalState(
        makeFetchParams({
          table: makeTable([], []),
          query: { esql: ESQL_NO_BY },
        }),
        data
      );

      expect(idle.status).toBe('idle');
      expect(esql).not.toHaveBeenCalled();
    });

    it('emits error when the line search rejects', async () => {
      const esql = jest.fn().mockRejectedValue(new Error('esql failed'));
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_WITH_HOST, [
        {
          host: 'a',
          bucket: '2023-11-15T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);

      const error = await waitForTerminalState(
        makeFetchParams({ table, query: { esql: ESQL_WITH_HOST_BY } }),
        data
      );

      expect(error.status).toBe('error');
      if (error.status === 'error') {
        expect(error.error.message).toBe('esql failed');
      }
    });

    it('fetches a line series for in-range no-BY queries instead of using the Discover table', async () => {
      const esql = jest.fn().mockResolvedValue({
        rawResponse: {
          columns: [{ name: 'bucket' }, { name: 'avg_bytes' }],
          values: [
            ['2023-11-14T00:00:00.000Z', 12],
            ['2023-11-15T00:00:00.000Z', 14],
          ],
        },
      });
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_NO_BY, [
        {
          bucket: '2023-11-15T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);

      const ready = await waitForTerminalState(
        makeFetchParams({ table, query: { esql: ESQL_NO_BY } }),
        data
      );

      expect(ready.status).toBe('ready');
      expect(esql).toHaveBeenCalledTimes(1);
      expect(esql.mock.calls[0][0].query).toContain('LIMIT 10000');
      expect(esql.mock.calls[0][0].query).not.toContain('CHANGE_POINT');
      if (ready.status === 'ready') {
        expect(ready.seriesByEntity.get('')).toHaveLength(2);
        expect(ready.cards).toHaveLength(1);
      }
    });

    it('fetches a line series with extended from when a no-BY annotation is before the range', async () => {
      const esql = jest.fn().mockResolvedValue({
        rawResponse: {
          columns: [{ name: 'bucket' }, { name: 'avg_bytes' }],
          values: [
            ['2023-11-10T00:00:00.000Z', 10],
            ['2023-11-15T00:00:00.000Z', 14],
          ],
        },
      });
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_NO_BY, [
        {
          bucket: '2023-11-10T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);

      const ready = await waitForTerminalState(
        makeFetchParams({ table, query: { esql: ESQL_NO_BY } }),
        data
      );

      expect(ready.status).toBe('ready');
      expect(esql).toHaveBeenCalledTimes(1);
      expect(esql.mock.calls[0][0].query).toContain('LIMIT 10000');
      expect(esql.mock.calls[0][0].query).not.toContain('CHANGE_POINT');
      expect(getTime).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ from: '2023-11-10T00:00:00.000Z' })
      );
      if (ready.status === 'ready') {
        expect(ready.seriesByEntity.get('')).toHaveLength(2);
      }
    });

    it('issues a single shared ES|QL line search for BY queries across subscribers', async () => {
      const esql = jest.fn().mockResolvedValue({
        rawResponse: {
          columns: [{ name: 'host' }, { name: 'bucket' }, { name: 'avg_bytes' }],
          values: [
            ['a', '2023-11-14T00:00:00.000Z', 12],
            ['a', '2023-11-15T00:00:00.000Z', 14],
          ],
        },
      });
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_WITH_HOST, [
        {
          host: 'a',
          bucket: '2023-11-15T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);
      const fetchParams = makeFetchParams({
        table,
        query: { esql: ESQL_WITH_HOST_BY },
      });

      const readyStates = await Promise.all([
        waitForTerminalState(fetchParams, data),
        waitForTerminalState(fetchParams, data),
      ]);

      expect(esql).toHaveBeenCalledTimes(1);
      expect(esql.mock.calls[0][0].query).toContain('STATS avg_bytes');
      expect(esql.mock.calls[0][0].query).toContain('WHERE host == "a"');
      expect(esql.mock.calls[0][0].query).toContain('LIMIT 10000');
      expect(esql.mock.calls[0][0].query).not.toContain('CHANGE_POINT');
      expect(esql.mock.calls[0][1]).toEqual(
        expect.objectContaining({ dropNullColumns: true, sessionId: 'session-1' })
      );

      for (const ready of readyStates) {
        expect(ready.status).toBe('ready');
        if (ready.status === 'ready') {
          expect(ready.seriesByEntity.get('host=a')).toHaveLength(2);
        }
      }
    });

    it('does not reuse a cached series when the time range changes', async () => {
      const esql = jest.fn().mockResolvedValue({
        rawResponse: { columns: [{ name: 'bucket' }, { name: 'avg_bytes' }], values: [] },
      });
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_WITH_HOST, [
        {
          host: 'a',
          bucket: '2023-11-15T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);

      await waitForTerminalState(
        makeFetchParams({
          table,
          query: { esql: ESQL_WITH_HOST_BY },
          timeRange: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
        }),
        data
      );
      await waitForTerminalState(
        makeFetchParams({
          table,
          query: { esql: ESQL_WITH_HOST_BY },
          timeRange: { from: '2023-11-01T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
        }),
        data
      );

      expect(esql).toHaveBeenCalledTimes(2);
    });

    it('aborts an in-flight line search when the last subscriber unsubscribes', async () => {
      let abortSignal: AbortSignal | undefined;
      const esql = jest.fn().mockImplementation((_query, opts: { abortSignal: AbortSignal }) => {
        abortSignal = opts.abortSignal;
        return new Promise(() => undefined);
      });
      const data = { search: { esql } } as unknown as DataPublicPluginStart;
      const table = makeTable(COLUMNS_WITH_HOST, [
        {
          host: 'a',
          bucket: '2023-11-15T00:00:00.000Z',
          avg_bytes: 14,
          type: 'mean_shift',
          pvalue: 0.001,
        },
      ]);
      const fetchParams = makeFetchParams({
        table,
        query: { esql: ESQL_WITH_HOST_BY },
      });

      const subscription = getChangePointSummarySeries$(fetchParams, data).subscribe();
      await Promise.resolve();
      await Promise.resolve();
      expect(esql).toHaveBeenCalled();
      expect(abortSignal?.aborted).toBe(false);

      subscription.unsubscribe();
      expect(abortSignal?.aborted).toBe(true);

      getChangePointSummarySeries$(fetchParams, data).subscribe();
      await Promise.resolve();
      await Promise.resolve();
      expect(esql).toHaveBeenCalledTimes(2);
    });
  });
});
