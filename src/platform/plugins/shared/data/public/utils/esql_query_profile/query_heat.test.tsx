/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { hasQueryHeat } from './query_heat';

const profile = (operators: Array<[string, Record<string, unknown>]>) =>
  aggregateEsqlProfile({
    drivers: [{ operators: operators.map(([operator, status]) => ({ operator, status })) }],
  });

describe('hasQueryHeat', () => {
  const timed = profile([['LuceneSourceOperator', { process_nanos: 5_000_000 }]]);

  it('is offered when a command of the query gets some of the time', () => {
    expect(hasQueryHeat(timed, 'FROM logs | WHERE a > 1')).toBe(true);
  });

  it('is not offered without a query, or with a query that has no commands', () => {
    expect(hasQueryHeat(timed, undefined)).toBe(false);
    expect(hasQueryHeat(timed, '   ')).toBe(false);
  });

  it('is not offered when no command explains any of the time', () => {
    const onlyPlumbing = profile([
      ['ExchangeSinkOperator', {}],
      ['MvExpandOperator', { process_nanos: 5_000_000 }],
    ]);

    expect(hasQueryHeat(onlyPlumbing, 'FROM logs | LIMIT 1')).toBe(false);
  });
});
