/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { buildQueryProfileHeat } from './query_heat_model';
import { getQueryProfileHeat, setQueryProfileHeat } from './query_heat_store';

const view = aggregateEsqlProfile({
  query: { took_millis: 100 },
  planning: { took_millis: 10 },
  drivers: [
    {
      description: 'data',
      operators: [
        { operator: 'LuceneSourceOperator', status: { process_nanos: 60_000_000 } },
        { operator: 'HashAggregationOperator', status: { hash_nanos: 30_000_000 } },
        { operator: 'TopNOperator', status: { receive_nanos: 10_000_000 } },
      ],
    },
  ],
});

describe('buildQueryProfileHeat', () => {
  const query = 'FROM logs\n| STATS c = COUNT(*) BY a\n| SORT c DESC';

  it('gives each command its share and its place in the query text', () => {
    const heat = buildQueryProfileHeat(view, query);

    expect(heat?.query).toBe(query);
    expect(heat?.commands.map((command) => query.slice(command.start, command.end))).toEqual([
      'FROM logs',
      'STATS c = COUNT(*) BY a',
      'SORT c DESC',
    ]);
    expect(heat?.commands.map((command) => Math.round(command.share * 100))).toEqual([60, 30, 10]);
    expect(heat?.commands[1].operators).toEqual(['HashAggregation']);
    expect(heat?.profileContext).toContain('The query took 100 ms in total');
  });

  it('returns nothing when no command gets any of the time', () => {
    const plumbing = aggregateEsqlProfile({
      drivers: [{ operators: [{ operator: 'ExchangeSinkOperator', status: {} }] }],
    });

    expect(buildQueryProfileHeat(plumbing, query)).toBeUndefined();
    expect(buildQueryProfileHeat(view, '   ')).toBeUndefined();
  });
});

describe('query profile heat store', () => {
  afterEach(() => setQueryProfileHeat(undefined));

  it('keeps the last heat and tells subscribers when it changes', () => {
    const heat = buildQueryProfileHeat(view, 'FROM logs | LIMIT 1');
    expect(getQueryProfileHeat()).toBeUndefined();

    setQueryProfileHeat(heat);

    expect(getQueryProfileHeat()).toBe(heat);
  });
});
