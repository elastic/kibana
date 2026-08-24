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
import { ESQLVariableType } from '@kbn/esql-types';
import {
  clearChangePointSummarySeriesCache,
  getChangePointSummarySeries$,
  getSeriesCacheKey,
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

const NO_BY_ROW = {
  bucket: '2023-11-15T00:00:00.000Z',
  avg_bytes: 14,
  type: 'mean_shift',
  pvalue: 0.001,
};

const HOST_ROW = { host: 'a', ...NO_BY_ROW };

const fixtures = {
  noBy: {
    esqlQuery: ESQL_NO_BY,
    columns: COLUMNS_NO_BY,
    rows: [NO_BY_ROW],
    lineColumns: ['bucket', 'avg_bytes'],
    lineValues: [['2023-11-15T00:00:00.000Z', 14]],
  },
  byHost: {
    esqlQuery: ESQL_WITH_HOST_BY,
    columns: COLUMNS_WITH_HOST,
    rows: [HOST_ROW],
    lineColumns: ['host', 'bucket', 'avg_bytes'],
    lineValues: [
      ['a', '2023-11-14T00:00:00.000Z', 12],
      ['a', '2023-11-15T00:00:00.000Z', 14],
    ],
  },
} as const;

type LineSearchFixture = keyof typeof fixtures;

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

const setupLineSearch = ({
  fixture = 'noBy',
  esqlQuery,
  columns,
  rows,
  lineColumns,
  lineValues,
  lineSearch = 'resolve',
  lineError,
  ...fetch
}: {
  fixture?: LineSearchFixture;
  esqlQuery?: string;
  columns?: Datatable['columns'];
  rows?: Datatable['rows'];
  lineColumns?: readonly string[];
  lineValues?: unknown[][];
  lineSearch?: 'resolve' | 'reject' | 'hang';
  lineError?: Error;
} & Omit<Partial<ChangePointFetchParams>, 'query' | 'table'> = {}) => {
  const base = fixtures[fixture];
  const resolvedQuery = esqlQuery ?? base.esqlQuery;
  const resolvedColumns = columns ?? [...base.columns];
  const resolvedRows = rows ?? [...base.rows];
  const resolvedLineColumns = lineColumns ?? [...base.lineColumns];
  const resolvedLineValues = lineValues ?? [...base.lineValues];

  let abortSignal: AbortSignal | undefined;
  const esql = jest.fn();
  if (lineSearch === 'reject') {
    esql.mockRejectedValue(lineError ?? new Error('esql failed'));
  } else if (lineSearch === 'hang') {
    esql.mockImplementation((_query, opts: { abortSignal: AbortSignal }) => {
      abortSignal = opts.abortSignal;
      return new Promise(() => undefined);
    });
  } else {
    esql.mockResolvedValue({
      rawResponse: {
        columns: resolvedLineColumns.map((name) => ({ name })),
        values: resolvedLineValues,
      },
    });
  }

  const fetchParams: ChangePointFetchParams = {
    searchSessionId: 'session-1',
    lastReloadRequestTime: 1,
    dataView: { isTimeBased: () => false } as never,
    filters: [],
    timeRange: { from: '2023-11-14T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
    table: makeTable(resolvedColumns, resolvedRows),
    query: { esql: resolvedQuery },
    ...fetch,
  } as ChangePointFetchParams;
  const data = { search: { esql } } as unknown as DataPublicPluginStart;

  return {
    esql,
    get abortSignal() {
      return abortSignal;
    },
    load: (fetchOverrides?: Partial<ChangePointFetchParams>) =>
      waitForTerminalState({ ...fetchParams, ...fetchOverrides }, data),
    subscribe: () => getChangePointSummarySeries$(fetchParams, data).subscribe(),
  };
};

describe('change_point_summary_series', () => {
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
      expect(
        getSeriesCacheKey({
          ...base,
          esqlVariables: [{ key: 'env', value: 'prod', type: ESQLVariableType.VALUES }],
        })
      ).not.toBe(same);
      expect(
        getSeriesCacheKey({
          ...base,
          esqlVariables: [{ key: 'env', value: 'staging', type: ESQLVariableType.VALUES }],
        })
      ).not.toBe(
        getSeriesCacheKey({
          ...base,
          esqlVariables: [{ key: 'env', value: 'prod', type: ESQLVariableType.VALUES }],
        })
      );
    });
  });

  describe('getChangePointSummarySeries$', () => {
    beforeEach(() => {
      clearChangePointSummarySeriesCache();
      jest.mocked(getTime).mockClear();
      jest.mocked(getTime).mockReturnValue(undefined);
    });

    it('stays idle when the table is missing', async () => {
      const { esql, load } = setupLineSearch({ columns: [], rows: [] });
      const idle = await load();

      expect(idle.status).toBe('idle');
      expect(esql).not.toHaveBeenCalled();
    });

    it('emits error when the line search rejects', async () => {
      const { load } = setupLineSearch({
        fixture: 'byHost',
        lineSearch: 'reject',
      });
      const error = await load();

      expect(error.status).toBe('error');
      if (error.status === 'error') {
        expect(error.error.message).toBe('esql failed');
      }
    });

    it('fetches a line series for in-range no-BY queries instead of using the Discover table', async () => {
      const { esql, load } = setupLineSearch({
        lineValues: [
          ['2023-11-14T00:00:00.000Z', 12],
          ['2023-11-15T00:00:00.000Z', 14],
        ],
      });
      const ready = await load();

      expect(ready.status).toBe('ready');
      expect(esql).toHaveBeenCalledTimes(1);
      expect(esql.mock.calls[0][0].query).toContain('LIMIT 10000');
      expect(esql.mock.calls[0][0].query).not.toContain('CHANGE_POINT');
      if (ready.status === 'ready') {
        expect(ready.seriesByEntity.get('')).toHaveLength(2);
        expect(ready.cards).toHaveLength(1);
      }
    });

    it('passes ?_tstart/?_tend named params so the line query can resolve Discover time parameters', async () => {
      const { esql, load } = setupLineSearch({
        esqlQuery:
          'FROM idx | WHERE @timestamp <= ?_tend AND @timestamp > ?_tstart | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket',
      });
      const ready = await load();

      expect(ready.status).toBe('ready');
      expect(getTime).toHaveBeenCalled();
      expect(esql).toHaveBeenCalledWith(
        expect.objectContaining({
          query: expect.stringContaining('?_tend'),
          params: expect.arrayContaining([
            { _tstart: expect.any(String) },
            { _tend: expect.any(String) },
          ]),
        }),
        expect.anything()
      );
    });

    it('rewrites a single-? field control to ?? and passes it as a named param', async () => {
      const { esql, load } = setupLineSearch({
        esqlQuery:
          'FROM idx | STATS avg_bytes = AVG(?metric) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket',
        esqlVariables: [{ key: 'metric', value: 'bytes', type: ESQLVariableType.FIELDS }],
      });
      const ready = await load();

      expect(ready.status).toBe('ready');
      expect(esql.mock.calls[0][0].query).toContain('AVG(??metric)');
      expect(esql.mock.calls[0][0].query).not.toContain('AVG(?metric)');
      expect(esql.mock.calls[0][0].params).toEqual(expect.arrayContaining([{ metric: 'bytes' }]));
    });

    it('passes value-control named params without rewriting ?value to ??value', async () => {
      const { esql, load } = setupLineSearch({
        esqlQuery:
          'FROM idx | WHERE host == ?env | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket',
        esqlVariables: [{ key: 'env', value: 'prod', type: ESQLVariableType.VALUES }],
      });
      const ready = await load();

      expect(ready.status).toBe('ready');
      expect(esql.mock.calls[0][0].query).toContain('host == ?env');
      expect(esql.mock.calls[0][0].query).not.toContain('??env');
      expect(esql.mock.calls[0][0].params).toEqual(expect.arrayContaining([{ env: 'prod' }]));
    });

    it('fetches a line series with extended from when a no-BY annotation is before the range', async () => {
      const { esql, load } = setupLineSearch({
        rows: [{ ...NO_BY_ROW, bucket: '2023-11-10T00:00:00.000Z' }],
        lineValues: [
          ['2023-11-10T00:00:00.000Z', 10],
          ['2023-11-15T00:00:00.000Z', 14],
        ],
      });
      const ready = await load();

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
      const { esql, load } = setupLineSearch({ fixture: 'byHost' });
      const readyStates = await Promise.all([load(), load()]);

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
      const { esql, load } = setupLineSearch({ fixture: 'byHost', lineValues: [] });

      await load();
      await load({
        timeRange: { from: '2023-11-01T00:00:00.000Z', to: '2023-11-20T00:00:00.000Z' },
      });

      expect(esql).toHaveBeenCalledTimes(2);
    });

    it('does not reuse a cached series when ES|QL variable values change', async () => {
      const { esql, load } = setupLineSearch({
        esqlQuery:
          'FROM idx | WHERE host == ?env | STATS avg_bytes = AVG(bytes) BY bucket = BUCKET(@timestamp, 1 day) | CHANGE_POINT avg_bytes ON bucket',
        lineValues: [],
        esqlVariables: [{ key: 'env', value: 'prod', type: ESQLVariableType.VALUES }],
      });

      await load();
      await load({
        esqlVariables: [{ key: 'env', value: 'staging', type: ESQLVariableType.VALUES }],
      });

      expect(esql).toHaveBeenCalledTimes(2);
    });

    it('aborts an in-flight line search when the last subscriber unsubscribes', async () => {
      const harness = setupLineSearch({ fixture: 'byHost', lineSearch: 'hang' });

      const subscription = harness.subscribe();
      await Promise.resolve();
      await Promise.resolve();
      expect(harness.esql).toHaveBeenCalled();
      expect(harness.abortSignal?.aborted).toBe(false);

      subscription.unsubscribe();
      expect(harness.abortSignal?.aborted).toBe(true);

      harness.subscribe();
      await Promise.resolve();
      await Promise.resolve();
      expect(harness.esql).toHaveBeenCalledTimes(2);
    });
  });
});
