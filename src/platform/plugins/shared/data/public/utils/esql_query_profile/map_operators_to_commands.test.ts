/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { mapOperatorsToCommands } from './map_operators_to_commands';
import { splitQueryCommands } from './query_commands';

const operators = (list: Array<[string, Record<string, unknown>]>) =>
  aggregateEsqlProfile({
    drivers: [
      {
        description: 'data',
        operators: list.map(([operator, status]) => ({ operator, status })),
      },
    ],
  }).operators;

describe('mapOperatorsToCommands', () => {
  it('attributes each operator to the command it implements', () => {
    const commands = splitQueryCommands(
      'FROM logs | WHERE a > 1 | EVAL b = a * 2 | STATS c = COUNT(*) BY b | SORT c DESC | KEEP c'
    );
    const heat = mapOperatorsToCommands(
      commands,
      operators([
        ['LuceneSourceOperator', { process_nanos: 50_000_000 }],
        ['ValuesSourceReaderOperator[fields = [a]]', { process_nanos: 20_000_000 }],
        ['FilterOperator', { process_nanos: 5_000_000 }],
        ['EvalOperator', { process_nanos: 5_000_000 }],
        ['HashAggregationOperator[mode=INITIAL]', { hash_nanos: 15_000_000 }],
        ['TopNOperator', { receive_nanos: 3_000_000 }],
        ['ProjectOperator', { process_nanos: 2_000_000 }],
        ['ExchangeSinkOperator', {}],
      ])
    );

    const byName = Object.fromEntries(heat.commands.map((entry) => [entry.command.name, entry]));
    expect(byName.FROM.nanos).toBe(70_000_000);
    expect(byName.FROM.share).toBeCloseTo(0.7);
    expect(byName.FROM.operators).toEqual(['LuceneSource', 'ValuesSourceReader']);
    expect(byName.WHERE.nanos).toBe(5_000_000);
    expect(byName.STATS.nanos).toBe(15_000_000);
    expect(byName.SORT.nanos).toBe(3_000_000);
    expect(byName.KEEP.nanos).toBe(2_000_000);
    expect(heat.commands.every((entry) => !entry.isApproximate)).toBe(true);
    expect(heat.unattributedNanos).toBe(0);
  });

  it('shares the time of an operator between commands it could belong to', () => {
    const commands = splitQueryCommands(
      'FROM logs | STATS r = COUNT(*) BY a, b | STATS t = SUM(r) BY a | SORT t DESC'
    );
    const heat = mapOperatorsToCommands(
      commands,
      operators([
        ['LuceneSourceOperator', { process_nanos: 10_000_000 }],
        ['HashAggregationOperator[mode=INITIAL]', { hash_nanos: 60_000_000 }],
        ['HashAggregationOperator[mode=FINAL]', { hash_nanos: 20_000_000 }],
        ['TopNOperator', { receive_nanos: 10_000_000 }],
      ])
    );

    const [, firstStats, secondStats, sort] = heat.commands;
    expect(firstStats.nanos).toBe(0);
    expect(firstStats.sharedNanos).toBe(80_000_000);
    expect(firstStats.share).toBeCloseTo(0.8);
    expect(firstStats.isApproximate).toBe(true);
    expect(secondStats.sharedNanos).toBe(80_000_000);
    expect(secondStats.isApproximate).toBe(true);
    expect(sort.nanos).toBe(10_000_000);
    expect(sort.isApproximate).toBe(false);
  });

  it('puts operators with no command, and operators that report no time, aside', () => {
    const commands = splitQueryCommands('FROM logs | LIMIT 10');
    const heat = mapOperatorsToCommands(
      commands,
      operators([
        ['LuceneSourceOperator', { process_nanos: 8_000_000 }],
        ['MvExpandOperator', { process_nanos: 2_000_000 }],
        ['ExchangeSourceOperator', { rows_emitted: 10 }],
      ])
    );

    expect(heat.unattributedNanos).toBe(2_000_000);
    expect(heat.unattributedShare).toBeCloseTo(0.2);
    expect(heat.commands[1].nanos).toBe(0);
  });

  it('matches operators named after their command', () => {
    const commands = splitQueryCommands('FROM logs | MV_EXPAND tags | DISSECT msg "%{a}"');
    const heat = mapOperatorsToCommands(
      commands,
      operators([
        ['MvExpandOperator', { process_nanos: 4_000_000 }],
        ['DissectOperator', { process_nanos: 6_000_000 }],
      ])
    );

    expect(heat.commands[1].nanos).toBe(4_000_000);
    expect(heat.commands[2].nanos).toBe(6_000_000);
  });

  it('returns zero shares when nothing reports a time', () => {
    const heat = mapOperatorsToCommands(
      splitQueryCommands('FROM logs'),
      operators([['ExchangeSinkOperator', {}]])
    );

    expect(heat.commands[0].share).toBe(0);
    expect(heat.unattributedShare).toBe(0);
  });
});

describe('mapOperatorsToCommands with subqueries', () => {
  const query = [
    'FROM',
    '  (FROM logs | STATS requests = COUNT(*) BY clientip, os | STATS total = SUM(requests) BY os),',
    '  (FROM logs | WHERE os == "ios" | STATS total = COUNT(*) BY os)',
    '| SORT total DESC',
  ].join('\n');

  const driver = (description: string, ops: Array<[string, Record<string, unknown>]>) => ({
    description,
    operators: ops.map(([operator, status]) => ({ operator, status })),
  });

  // The order and the names of the drivers follow a real profile of a query like this one:
  // the data drivers of a subquery come right before its final driver.
  const labeled = aggregateEsqlProfile({
    drivers: [
      driver('data', [
        ['LuceneSourceOperator', { process_nanos: 2_000_000 }],
        ['ValuesSourceReaderOperator[fields = [os]]', { process_nanos: 1_000_000 }],
        ['HashAggregationOperator[mode=INITIAL]', { hash_nanos: 1_000_000 }],
      ]),
      driver('subplan-1.final', [
        ['ExchangeSourceOperator', {}],
        ['HashAggregationOperator[mode=FINAL]', { hash_nanos: 1_000_000 }],
      ]),
      driver('data', [
        ['LuceneSourceOperator', { process_nanos: 20_000_000 }],
        ['ValuesSourceReaderOperator[fields = [clientip, os]]', { process_nanos: 60_000_000 }],
        ['HashAggregationOperator[mode=INITIAL]', { hash_nanos: 10_000_000 }],
      ]),
      driver('subplan-0.final', [
        ['HashAggregationOperator[mode=FINAL]', { hash_nanos: 4_000_000 }],
        ['HashAggregationOperator[mode=SINGLE]', { hash_nanos: 1_000_000 }],
      ]),
      driver('main.final', [
        ['ExchangeSourceOperator', {}],
        ['TopNOperator', { receive_nanos: 1_000_000 }],
      ]),
    ],
  }).operators;

  it('gives the commands of each subquery the operators of that subquery', () => {
    const heat = mapOperatorsToCommands(splitQueryCommands(query), labeled);

    expect(heat.hasSubqueries).toBe(true);
    expect(heat.commands.map(({ command, subquery }) => [command.name, subquery])).toEqual([
      ['FROM', 0],
      ['STATS', 0],
      ['STATS', 0],
      ['FROM', 1],
      ['WHERE', 1],
      ['STATS', 1],
      ['SORT', undefined],
    ]);

    const [firstFrom, firstStats, secondStats, secondFrom, where, lastStats, sort] = heat.commands;
    const total = 2 + 1 + 1 + 1 + 20 + 60 + 10 + 4 + 1 + 1;
    // The first subquery reads two fields and the data comes from its own drivers.
    expect(firstFrom.nanos).toBe(80_000_000);
    expect(firstFrom.share).toBeCloseTo(80 / total);
    // Two aggregations in one subquery cannot be told apart, so they share the time.
    expect(firstStats.sharedNanos).toBe(15_000_000);
    expect(secondStats.sharedNanos).toBe(15_000_000);
    expect(firstStats.isApproximate).toBe(true);
    // The second subquery has one aggregation, so its time is exact.
    expect(secondFrom.nanos).toBe(3_000_000);
    expect(where.nanos).toBe(0);
    expect(lastStats.nanos).toBe(2_000_000);
    expect(lastStats.isApproximate).toBe(false);
    expect(sort.nanos).toBe(1_000_000);
    expect(heat.unattributedNanos).toBe(0);
  });

  it('treats every command as a candidate when the profile does not name the subplans', () => {
    const unlabeled = aggregateEsqlProfile({
      drivers: [
        driver('data', [['LuceneSourceOperator', { process_nanos: 10_000_000 }]]),
        driver('data', [['HashAggregationOperator[mode=INITIAL]', { hash_nanos: 6_000_000 }]]),
        driver('final', [['TopNOperator', { receive_nanos: 4_000_000 }]]),
      ],
    }).operators;

    const heat = mapOperatorsToCommands(splitQueryCommands(query), unlabeled);

    // Without the names the time goes to the first source command, and to all aggregations.
    expect(heat.commands[0].nanos).toBe(10_000_000);
    const aggregations = heat.commands.filter(({ command }) => command.name === 'STATS');
    expect(aggregations.map(({ sharedNanos }) => sharedNanos)).toEqual([
      6_000_000, 6_000_000, 6_000_000,
    ]);
    expect(heat.commands.at(-1)?.nanos).toBe(4_000_000);
  });

  it('keeps a query without subqueries exactly as before, whatever the drivers are called', () => {
    const plain = splitQueryCommands('FROM logs | STATS c = COUNT(*) BY a | SORT c DESC');
    const heat = mapOperatorsToCommands(plain, labeled);

    expect(heat.hasSubqueries).toBe(false);
    expect(heat.commands.every(({ subquery }) => subquery === undefined)).toBe(true);
  });

  it('leaves out the time of a subquery that the query does not have', () => {
    const single = splitQueryCommands('FROM (FROM logs | STATS c = COUNT(*) BY a) | SORT c DESC');
    const heat = mapOperatorsToCommands(single, labeled);

    // subplan-1 does not exist in this query, so its operators belong to nothing.
    expect(heat.unattributedNanos).toBe(3_000_000 + 1_000_000 + 1_000_000);
  });
});
