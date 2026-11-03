/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { compareProfiles } from './compare_profiles';

const profile = (
  queryMillis: number,
  planningMillis: number,
  operators: Array<[string, Record<string, unknown>]>
) =>
  aggregateEsqlProfile({
    query: { took_millis: queryMillis },
    planning: { took_millis: planningMillis },
    drivers: [
      {
        description: 'data',
        operators: operators.map(([operator, status]) => ({ operator, status })),
      },
    ],
  });

describe('compareProfiles', () => {
  it('reports a faster run and the operators that changed, biggest change first', () => {
    const baseline = profile(1_000, 100, [
      ['LuceneSourceOperator', { process_nanos: 600_000_000 }],
      ['EvalOperator', { process_nanos: 50_000_000 }],
      ['TopNOperator', { receive_nanos: 10_000_000 }],
    ]);
    const current = profile(400, 100, [
      ['LuceneSourceOperator', { process_nanos: 100_000_000 }],
      ['EvalOperator', { process_nanos: 50_000_000 }],
      ['TopNOperator', { receive_nanos: 20_000_000 }],
    ]);

    const comparison = compareProfiles(baseline, current);

    expect(comparison.total).toEqual({
      baseline: 1_000,
      current: 400,
      ratio: -0.6,
      trend: 'faster',
    });
    expect(comparison.planning?.trend).toBe('same');
    expect(comparison.execution).toEqual({
      baseline: 900,
      current: 300,
      ratio: -600 / 900,
      trend: 'faster',
    });
    expect(comparison.cpu).toEqual({
      baseline: 660,
      current: 170,
      ratio: -490 / 660,
      trend: 'faster',
    });
    expect(comparison.operators.map(({ title, trend }) => [title, trend])).toEqual([
      ['LuceneSource', 'faster'],
      ['TopN', 'slower'],
    ]);
  });

  it('treats changes under five percent, or under a millisecond, as noise', () => {
    const baseline = profile(1_000, 100, [['EvalOperator', { process_nanos: 100_000_000 }]]);
    const current = profile(1_040, 100, [['EvalOperator', { process_nanos: 103_000_000 }]]);
    const tiny = compareProfiles(profile(0.5, 0.2, []), profile(0.9, 0.4, []));

    const comparison = compareProfiles(baseline, current);

    expect(comparison.total?.trend).toBe('same');
    expect(comparison.operators).toEqual([]);
    expect(tiny.total?.trend).toBe('same');
  });

  it('flags operators that only exist in one of the runs', () => {
    const baseline = profile(100, 10, [
      ['ValuesSourceReaderOperator', { process_nanos: 8_000_000 }],
    ]);
    const current = profile(100, 10, [['EvalOperator', { process_nanos: 6_000_000 }]]);

    const { operators } = compareProfiles(baseline, current);

    expect(operators).toEqual([
      {
        title: 'ValuesSourceReader',
        baselineNanos: 8_000_000,
        currentNanos: undefined,
        deltaNanos: -8_000_000,
        ratio: -1,
        trend: 'faster',
      },
      {
        title: 'Eval',
        baselineNanos: undefined,
        currentNanos: 6_000_000,
        deltaNanos: 6_000_000,
        ratio: undefined,
        trend: 'slower',
      },
    ]);
  });

  it('leaves out operators that report no time and metrics that are missing', () => {
    const baseline = aggregateEsqlProfile({
      drivers: [
        { operators: [{ operator: 'ExchangeSinkOperator', status: { rows_received: 1 } }] },
      ],
    });
    const current = profile(100, 10, [['ExchangeSinkOperator', { rows_received: 9 }]]);

    const comparison = compareProfiles(baseline, current);

    expect(comparison.total).toBeUndefined();
    expect(comparison.operators).toEqual([]);
  });
});
