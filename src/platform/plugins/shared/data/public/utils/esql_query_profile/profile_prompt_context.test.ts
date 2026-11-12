/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { buildProfileContext } from './profile_prompt_context';

describe('buildProfileContext', () => {
  const view = aggregateEsqlProfile({
    query: { took_millis: 120 },
    planning: { took_millis: 20 },
    drivers: [
      {
        description: 'data',
        node_name: 'node-a',
        start_millis: 1_000,
        stop_millis: 1_100,
        operators: [
          {
            operator: 'LuceneSourceOperator[shards = [logs:0]]',
            status: { process_nanos: 80_000_000, rows_emitted: 96_440 },
          },
          {
            operator: 'HashAggregationOperator[mode=INITIAL]',
            status: { hash_nanos: 1_000_000, aggregation_nanos: 9_000_000, rows_received: 96_440 },
          },
          { operator: 'ExchangeSinkOperator', status: { rows_received: 5 } },
        ],
      },
    ],
    plans: [{ description: 'data', node_name: 'node-a', plan: 'AggregateExec[...]' }],
  });

  it('states the timings, slowest operators first, and leaves out operators with no time', () => {
    const context = buildProfileContext(view);

    expect(context).toContain('The query took 120 ms in total: planning 20 ms, execution 100 ms.');
    expect(context.indexOf('LuceneSource')).toBeLessThan(context.indexOf('HashAggregation'));
    expect(context).toContain('HashAggregation [mode=INITIAL]: 10 ms');
    expect(context).toContain('96440 rows in');
    expect(context).not.toContain('ExchangeSink');
  });

  it('includes drivers, findings and the physical plan', () => {
    const context = buildProfileContext(view);

    expect(context).toContain('- data · node-a: ran 100 ms, waited 0 ms');
    expect(context).toContain('"kind":"dominantOperator"');
    expect(context).toContain('Physical plan (data):\nAggregateExec[...]');
  });

  it('is bounded, however large the plan is', () => {
    const huge = aggregateEsqlProfile({
      plans: [
        { plan: 'x'.repeat(200_000) },
        { plan: 'y'.repeat(200_000) },
        { plan: 'z'.repeat(200_000) },
      ],
    });

    const context = buildProfileContext(huge);

    expect(context.length).toBeLessThanOrEqual(50_001);
    expect(context).not.toContain('z');
  });

  it('is empty for an empty profile', () => {
    expect(buildProfileContext(aggregateEsqlProfile(undefined))).toBe('');
  });
});
