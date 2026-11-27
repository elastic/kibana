/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from '../profile/aggregate_esql_profile';
import { buildProfileContext } from './profile_prompt_context';

describe('buildProfileContext', () => {
  it('describes the timing, the slowest operators, the drivers and the plan', () => {
    const context = buildProfileContext(
      aggregateEsqlProfile({
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
                operator: 'ValuesSourceReaderOperator[fields = [body]]',
                status: { process_nanos: 90_000_000, rows_received: 10, rows_emitted: 10 },
              },
              { operator: 'ExchangeSinkOperator', status: { rows_received: 10 } },
            ],
          },
        ],
        plans: [{ description: 'data', plan: 'EsQueryExec[logs]' }],
      })
    );

    expect(context).toContain('The query took 120 ms in total: planning 20 ms, execution 100 ms.');
    expect(context).toContain('ValuesSourceReader [fields = [body]]: 90 ms (100%), 10 rows in');
    expect(context).not.toContain('ExchangeSink');
    expect(context).toContain('- data · node-a: ran 100 ms, waited 0 ms');
    expect(context).toContain('EsQueryExec[logs]');
  });

  it('stays within what the optimize route accepts, however large the profile is', () => {
    const operators = Array.from({ length: 200 }, (_, index) => ({
      operator: `Operator${index}[${'x'.repeat(5_000)}]`,
      status: { process_nanos: 1_000_000 + index, rows_received: 1, rows_emitted: 1 },
    }));
    const context = buildProfileContext(
      aggregateEsqlProfile({
        query: { took_millis: 1 },
        drivers: [{ description: 'data', operators }],
        plans: [{ plan: 'p'.repeat(100_000) }],
      })
    );

    // The route rejects a profile context longer than 60,000 characters.
    expect(context.length).toBeLessThanOrEqual(60_000);
  });
});
