/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { deriveInsights, summarizeCpuByCategory } from './profile_insights';

const op = (operator: string, status: Record<string, unknown>) => ({ operator, status });

describe('summarizeCpuByCategory', () => {
  it('groups operator CPU by kind and leaves out operators that report no time', () => {
    const { operators } = aggregateEsqlProfile({
      drivers: [
        {
          description: 'data',
          operators: [
            op('LuceneSourceOperator', { process_nanos: 6_000_000 }),
            op('ValuesSourceReaderOperator[fields = [a]]', { process_nanos: 2_000_000 }),
            op('EvalOperator', { process_nanos: 1_000_000 }),
            op('HashAggregationOperator', { hash_nanos: 500_000, aggregation_nanos: 500_000 }),
            op('ExchangeSinkOperator', { rows_received: 5 }),
          ],
        },
      ],
    });

    const breakdown = summarizeCpuByCategory(operators);

    expect(breakdown.map(({ category, nanos }) => [category, nanos])).toEqual([
      ['source', 8_000_000],
      ['compute', 1_000_000],
      ['aggregate', 1_000_000],
    ]);
    expect(breakdown[0].share).toBeCloseTo(0.8);
  });

  it('returns nothing when no operator reports a time', () => {
    const { operators } = aggregateEsqlProfile({
      drivers: [{ operators: [op('ExchangeSinkOperator', {})] }],
    });
    expect(summarizeCpuByCategory(operators)).toEqual([]);
  });
});

describe('deriveInsights', () => {
  it('points at an operator that dominates the CPU time', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            op('LuceneSourceOperator', { process_nanos: 9_000_000 }),
            op('EvalOperator', { process_nanos: 1_000_000 }),
          ],
        },
      ],
    });

    expect(deriveInsights(view)).toEqual([
      { kind: 'dominantOperator', severity: 'warning', title: 'LuceneSource', share: 0.9 },
    ]);
  });

  it('stays quiet about tiny queries and balanced pipelines', () => {
    const tiny = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            op('LuceneSourceOperator', { process_nanos: 9_000 }),
            op('EvalOperator', { process_nanos: 1_000 }),
          ],
        },
      ],
    });
    const balanced = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            op('LuceneSourceOperator', { process_nanos: 4_000_000 }),
            op('EvalOperator', { process_nanos: 3_000_000 }),
            op('TopNOperator', { receive_nanos: 3_000_000 }),
          ],
        },
      ],
    });

    expect(deriveInsights(tiny)).toEqual([]);
    expect(deriveInsights(balanced)).toEqual([]);
  });

  it('reports a driver that mostly waited, and notes when waits were not all recorded', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          description: 'final',
          node_name: 'node-a',
          start_millis: 1_000,
          stop_millis: 1_100,
          sleeps: {
            counts: { 'exchange empty': 9 },
            first: [
              {
                reason: 'exchange empty',
                thread_name: 'T#1',
                sleep_millis: 1_010,
                wake_millis: 1_090,
              },
            ],
          },
        },
      ],
    });

    expect(deriveInsights(view)).toEqual([
      {
        kind: 'driverWait',
        severity: 'info',
        driver: 'final · node-a',
        share: 0.8,
        atLeast: true,
        reason: 'exchange empty',
      },
    ]);
  });

  it('reports planning that dominates a query', () => {
    const view = aggregateEsqlProfile({
      query: { took_millis: 100 },
      planning: { took_millis: 60 },
    });

    expect(deriveInsights(view)).toEqual([
      { kind: 'planningHeavy', severity: 'warning', share: 0.6, planningMillis: 60 },
    ]);
  });

  it('reports a data driver much slower than the median', () => {
    const driver = (stop: number) => ({
      description: 'data',
      start_millis: 1_000,
      stop_millis: stop,
    });
    const view = aggregateEsqlProfile({
      drivers: [driver(1_010), driver(1_012), driver(1_100)],
    });

    expect(deriveInsights(view)).toEqual([
      {
        kind: 'driverSkew',
        severity: 'warning',
        description: 'data',
        slowestMillis: 100,
        medianMillis: 12,
      },
    ]);
  });

  it('reports heavy decoding and a filter that dropped almost every row', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        {
          operators: [
            op('ValuesSourceReaderOperator[fields = [body]]', {
              process_nanos: 1,
              bytes_read: 5_000_000,
              bytes_decoded: 80_000_000,
            }),
            op('FilterOperator', {
              process_nanos: 1,
              rows_received: 100_000,
              rows_emitted: 500,
            }),
          ],
        },
      ],
    });

    expect(deriveInsights(view)).toEqual([
      {
        kind: 'readExpansion',
        severity: 'info',
        title: 'ValuesSourceReader',
        storedBytes: 5_000_000,
        decodedBytes: 80_000_000,
        expansion: 16,
      },
      { kind: 'lateFilter', severity: 'info', title: 'Filter', rowsIn: 100_000, rowsOut: 500 },
    ]);
  });

  it('lists warnings first and keeps at most five insights', () => {
    const view = aggregateEsqlProfile({
      query: { took_millis: 100 },
      planning: { took_millis: 60 },
      drivers: [
        {
          description: 'data',
          operators: [
            op('ValuesSourceReaderOperator', {
              process_nanos: 9_000_000,
              bytes_read: 1_000_000,
              bytes_decoded: 90_000_000,
            }),
            op('EvalOperator', { process_nanos: 1_000_000 }),
          ],
        },
      ],
    });

    const kinds = deriveInsights(view).map((insight) => insight.kind);
    expect(kinds.slice(0, 2).sort()).toEqual(['dominantOperator', 'planningHeavy']);
    expect(kinds[2]).toBe('readExpansion');
    expect(kinds.length).toBeLessThanOrEqual(5);
  });
});

describe('deriveInsights straggler', () => {
  const driver = (description: string, start: number, stop: number, wake?: number) => ({
    description,
    start_millis: 1_000 + start,
    stop_millis: 1_000 + stop,
    sleeps: wake
      ? {
          counts: { 'exchange empty': 1 },
          last: [
            {
              reason: 'exchange empty',
              thread_name: 't',
              sleep_millis: 1_010,
              wake_millis: 1_000 + wake,
            },
          ],
        }
      : undefined,
  });

  it('says the query waited for one driver while the others sat done', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        ...Array.from({ length: 6 }, () => driver('data', 2, 29)),
        driver('data', 2, 46),
        driver('final', 1, 47, 46),
      ],
    });

    expect(deriveInsights(view)).toContainEqual({
      kind: 'straggler',
      severity: 'warning',
      description: 'data',
      lagMillis: 17,
      startMillis: 1,
      startedLate: false,
    });
  });

  it('says a driver that started when the others finished was likely waiting for a thread', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        ...Array.from({ length: 6 }, () => driver('data', 2, 29)),
        driver('data', 29, 46),
        driver('final', 1, 47, 46),
      ],
    });

    expect(deriveInsights(view)).toContainEqual(
      expect.objectContaining({ kind: 'straggler', startedLate: true, startMillis: 28 })
    );
  });

  it('says nothing when every driver finished about together', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        ...Array.from({ length: 6 }, () => driver('data', 2, 46)),
        driver('final', 1, 47, 46),
      ],
    });

    expect(deriveInsights(view).map((insight) => insight.kind)).not.toContain('straggler');
  });

  it('leaves out the slow driver among its peers when the straggler already says it', () => {
    const view = aggregateEsqlProfile({
      drivers: [
        ...Array.from({ length: 6 }, () => driver('data', 2, 29)),
        driver('data', 2, 46),
        driver('final', 1, 47, 46),
      ],
    });

    const kinds = deriveInsights(view).map((insight) => insight.kind);

    expect(kinds).toContain('straggler');
    expect(kinds).not.toContain('driverSkew');
  });
});
