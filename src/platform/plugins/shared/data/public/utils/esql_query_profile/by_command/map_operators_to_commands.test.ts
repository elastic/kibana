/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from '../profile/aggregate_esql_profile';
import { mapOperatorsToCommands } from './map_operators_to_commands';
import { splitQueryCommands } from './query_commands';

/** Where a piece of text is in a query, as ES reports the source of a plan node: in characters. */
const sourceOf = (query: string, text: string, from = 0) => {
  const lines = query.slice(0, query.indexOf(text, from)).split('\n');
  return {
    line: lines.length,
    column: Array.from(lines[lines.length - 1]).length + 1,
    text,
    view: null,
  };
};

const NO_SOURCE = { line: null, column: null, text: null, view: null };

interface Step {
  operator: string;
  /** The plan node the operator was built from, and the text of the command that node came from. */
  node?: {
    id: string;
    text?: string;
    /** Look for the text from here, for a repeated one. */ from?: number;
  };
  /** Left out for an operator that reports no time. */
  nanos?: number;
}

interface Options {
  /** The query that ES planned, when it is not the one that is shown. */
  plannedQuery?: string;
  /** The node that planned the query, and the node that ran the drivers. */
  planningNode?: string;
  runningNode?: string;
}

/** Runs the whole path: a profile with plan nodes and operators, then the attribution to commands. */
const heatOf = (
  query: string,
  steps: Step[],
  { plannedQuery = query, planningNode = 'node-a', runningNode = 'node-a' }: Options = {}
) => {
  const view = aggregateEsqlProfile({
    drivers: [
      {
        description: 'data',
        node_name: runningNode,
        operators: steps.map(({ operator, node, nanos }) => ({
          operator,
          plan_node_id: node?.id,
          status: nanos === undefined ? {} : { process_nanos: nanos },
        })),
      },
    ],
    plans: [
      {
        description: 'data',
        node_name: planningNode,
        plan: 'plan',
        plan_json: {
          id: 'root',
          source: NO_SOURCE,
          children: steps.flatMap(({ node }) =>
            node
              ? [
                  {
                    id: node.id,
                    source: node.text ? sourceOf(plannedQuery, node.text, node.from) : NO_SOURCE,
                  },
                ]
              : []
          ),
        },
      },
    ],
  });

  return mapOperatorsToCommands({
    query,
    commands: splitQueryCommands(query),
    operators: view.operators,
    planNodeSources: view.planNodeSources,
  });
};

const sharesByCommand = (heat: ReturnType<typeof heatOf>) =>
  heat.commands.map(({ command, share }) => [command.text, Number(share.toFixed(2))]);

describe('mapOperatorsToCommands', () => {
  const QUERY = 'FROM logs\n| WHERE a > 1\n| STATS c = COUNT(*) BY a\n| SORT c DESC';

  it('gives each command the operators built from its plan nodes, and leaves out steps with no source', () => {
    const heat = heatOf(QUERY, [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM logs' }, nanos: 40 },
      {
        operator: 'ValuesSourceReaderOperator[fields = [a]]',
        node: { id: '2', text: 'STATS c = COUNT(*) BY a' },
        nanos: 20,
      },
      {
        operator: 'HashAggregationOperator',
        node: { id: '3', text: 'STATS c = COUNT(*) BY a' },
        nanos: 20,
      },
      { operator: 'TopNOperator', node: { id: '4', text: 'SORT c DESC' }, nanos: 10 },
      { operator: 'OutputOperator', node: { id: '5' }, nanos: 10 },
    ]);

    expect(sharesByCommand(heat)).toEqual([
      ['FROM logs', 0.4],
      ['WHERE a > 1', 0],
      ['STATS c = COUNT(*) BY a', 0.4],
      ['SORT c DESC', 0.1],
    ]);
    expect(heat.commands[2].operators).toEqual(['ValuesSourceReader', 'HashAggregation']);
    expect(heat.unattributedShare).toBeCloseTo(0.1);
    // The operators with time that was not matched to a command are named, the slowest first.
    expect(heat.unattributedOperators).toEqual(['Output']);
  });

  it('tells apart two commands of the same kind by where they are in the query', () => {
    const query = 'FROM logs | STATS r = COUNT(*) BY a, b | STATS t = SUM(r) BY a';
    const heat = heatOf(query, [
      {
        operator: 'HashAggregationOperator',
        node: { id: '1', text: 'STATS r = COUNT(*) BY a, b' },
        nanos: 60,
      },
      {
        operator: 'HashAggregationOperator',
        node: { id: '2', text: 'STATS t = SUM(r) BY a' },
        nanos: 40,
      },
    ]);

    expect(sharesByCommand(heat)).toEqual([
      ['FROM logs', 0],
      ['STATS r = COUNT(*) BY a, b', 0.6],
      ['STATS t = SUM(r) BY a', 0.4],
    ]);
  });

  it('finds the command after an emoji on the same line, as ES counts it as one character', () => {
    const query = 'FROM logs | WHERE a == "😀😀" | LIMIT 5';
    const heat = heatOf(query, [
      { operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 5' }, nanos: 10 },
    ]);

    expect(sharesByCommand(heat)).toEqual([
      ['FROM logs', 0],
      ['WHERE a == "😀😀"', 0],
      ['LIMIT 5', 1],
    ]);
    expect(heat.unattributedShare).toBe(0);
  });

  it('does not believe a position whose text is not what the query has there', () => {
    const steps = [{ operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 10' }, nanos: 50 }];

    const planned = heatOf('FROM logs | LIMIT 10', steps);
    const edited = heatOf('FROM logs | LIMIT 99', steps, { plannedQuery: 'FROM logs | LIMIT 10' });

    expect(planned.commands[1].share).toBe(1);
    expect(edited.commands[1].share).toBe(0);
    expect(edited.unattributedShare).toBe(1);
    expect(edited.unattributedOperators).toEqual(['Limit']);
  });

  it('counts a plan node id on its own node only', () => {
    const steps = [{ operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 10' }, nanos: 50 }];

    const sameNode = heatOf('FROM logs | LIMIT 10', steps);
    const otherNode = heatOf('FROM logs | LIMIT 10', steps, { runningNode: 'node-b' });

    expect(sameNode.commands[1].share).toBe(1);
    expect(otherNode.commands[1].share).toBe(0);
  });

  it('has nothing to attribute when the profile has no plan nodes, as with older Elasticsearch', () => {
    const heat = heatOf(QUERY, [{ operator: 'LuceneSourceOperator', nanos: 40 }]);

    expect(heat.commands.every(({ share }) => share === 0)).toBe(true);
    expect(heat.unattributedShare).toBe(1);
  });

  it('names no operator that reports no time among those that were not matched to a command', () => {
    const heat = heatOf('FROM logs', [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM logs' }, nanos: 10 },
      { operator: 'OutputOperator', node: { id: '2' } },
      { operator: 'ExchangeSinkOperator', node: { id: '3' }, nanos: 5 },
      { operator: 'ProjectOperator', node: { id: '4' }, nanos: 20 },
    ]);

    expect(heat.unattributedOperators).toEqual(['Project', 'ExchangeSink']);
  });

  it('keeps an operator that reports no time in the list of its command', () => {
    const heat = heatOf('FROM logs | SORT a', [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM logs' }, nanos: 10 },
      { operator: 'ExchangeSinkOperator', node: { id: '2', text: 'SORT a' } },
    ]);

    expect(heat.commands.map(({ operators }) => operators)).toEqual([
      ['LuceneSource'],
      ['ExchangeSink'],
    ]);
  });

  it('returns zero shares when nothing reports a time', () => {
    const view = aggregateEsqlProfile({
      drivers: [{ operators: [{ operator: 'LimitOperator', plan_node_id: '1', status: {} }] }],
    });
    const heat = mapOperatorsToCommands({
      query: 'FROM logs | LIMIT 10',
      commands: splitQueryCommands('FROM logs | LIMIT 10'),
      operators: view.operators,
      planNodeSources: {},
    });

    expect(heat.commands.every(({ share }) => share === 0)).toBe(true);
    expect(heat.unattributedShare).toBe(0);
  });
});

describe('mapOperatorsToCommands with subqueries', () => {
  const FIRST = 'FROM logs | WHERE a > 1 | STATS c = COUNT(*) BY a';
  const SECOND = 'FROM logs | STATS c = COUNT(*) BY a';
  const MERGE = `(${FIRST}), (${SECOND})`;
  const QUERY = `FROM ${MERGE}\n| SORT c DESC`;

  const heat = heatOf(QUERY, [
    // The same command text appears in both subqueries, and only the position tells them apart.
    {
      operator: 'HashAggregationOperator',
      node: { id: '1', text: 'STATS c = COUNT(*) BY a' },
      nanos: 30,
    },
    {
      operator: 'HashAggregationOperator',
      node: { id: '2', text: 'STATS c = COUNT(*) BY a', from: QUERY.indexOf(SECOND) },
      nanos: 50,
    },
    { operator: 'ExchangeSourceOperator', node: { id: '3', text: MERGE }, nanos: 5 },
    { operator: 'TopNOperator', node: { id: '4', text: 'SORT c DESC' }, nanos: 15 },
  ]);

  it('gives the commands of each subquery the operators built from them', () => {
    expect(heat.hasSubqueries).toBe(true);
    expect(
      heat.commands.map(({ command, subquery, share }) => [
        command.name,
        subquery,
        Number(share.toFixed(2)),
      ])
    ).toEqual([
      ['FROM', 0, 0],
      ['WHERE', 0, 0],
      ['STATS', 0, 0.3],
      ['FROM', 1, 0],
      ['STATS', 1, 0.5],
      ['FROM', undefined, 0.05],
      ['SORT', undefined, 0.15],
    ]);
  });

  it('leaves out the row of the FROM that holds the subqueries when it took no time of its own', () => {
    const idle = heatOf(QUERY, [
      { operator: 'TopNOperator', node: { id: '4', text: 'SORT c DESC' }, nanos: 15 },
      // The operators that merge the subqueries report no time, but they are on the FROM.
      { operator: 'ExchangeSourceOperator', node: { id: '3', text: MERGE } },
    ]);

    expect(idle.commands.map(({ command }) => command.name)).toEqual([
      'FROM',
      'WHERE',
      'STATS',
      'FROM',
      'STATS',
      'SORT',
    ]);
  });

  it('numbers the subqueries across the whole query when more than one command has them', () => {
    const query = 'FROM (FROM a | LIMIT 1), (FROM b | LIMIT 2) | FORK (LIMIT 3) (LIMIT 4)';
    const steps = [
      { operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 3' }, nanos: 40 },
      { operator: 'LimitOperator', node: { id: '2', text: 'LIMIT 1' }, nanos: 60 },
    ];

    const forks = heatOf(query, steps);

    expect(
      forks.commands.map(({ command, subquery, share }) => [command.text, subquery, share])
    ).toEqual([
      ['FROM a', 0, 0],
      ['LIMIT 1', 0, 0.6],
      ['FROM b', 1, 0],
      ['LIMIT 2', 1, 0],
      ['LIMIT 3', 2, 0.4],
      ['LIMIT 4', 3, 0],
    ]);
  });

  it('gives the commands of a subquery in IN (...) their own operators, apart from the WHERE', () => {
    const query = 'FROM a | WHERE k IN (FROM b | KEEP k) | LIMIT 1';
    const inHeat = heatOf(query, [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM b' }, nanos: 30 },
      {
        operator: 'FilterOperator',
        node: { id: '2', text: 'WHERE k IN (FROM b | KEEP k)' },
        nanos: 10,
      },
      { operator: 'LimitOperator', node: { id: '3', text: 'LIMIT 1' }, nanos: 10 },
    ]);

    expect(
      inHeat.commands.map(({ command, subquery, share }) => [command.text, subquery, share])
    ).toEqual([
      ['FROM a', undefined, 0],
      ['FROM b', 0, 0.6],
      ['KEEP k', 0, 0],
      ['WHERE k IN (FROM b | KEEP k)', undefined, 0.2],
      ['LIMIT 1', undefined, 0.2],
    ]);
  });

  it('numbers a subquery by its first row, even when a nested one is listed after it', () => {
    const query = 'FROM (FROM a | WHERE k IN (FROM b | KEEP k))';
    const firstRowHeat = heatOf(query, []);

    expect(firstRowHeat.commands.map(({ command, subquery }) => [command.text, subquery])).toEqual([
      ['FROM a', 0],
      ['FROM b', 1],
      ['KEEP k', 1],
      ['WHERE k IN (FROM b | KEEP k)', 0],
    ]);
  });

  it('keeps the row of a FROM that has a source of its own besides the subqueries', () => {
    const query = 'FROM a, (FROM b | LIMIT 1) | LIMIT 5';
    const sourceHeat = heatOf(query, [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM a, (FROM b | LIMIT 1)' } },
      { operator: 'LimitOperator', node: { id: '2', text: 'LIMIT 5' }, nanos: 10 },
    ]);

    expect(sourceHeat.commands.map(({ command }) => command.text)).toEqual([
      'FROM b',
      'LIMIT 1',
      'FROM a, (FROM b | LIMIT 1)',
      'LIMIT 5',
    ]);
  });

  it('keeps the row of a WHERE with a subquery in IN (...) when it has no operator of its own', () => {
    const query = 'FROM a | WHERE k IN (FROM b | KEEP k)';
    const idleHeat = heatOf(query, [
      { operator: 'LuceneSourceOperator', node: { id: '1', text: 'FROM a' }, nanos: 10 },
    ]);

    expect(idleHeat.commands.map(({ command }) => command.text)).toEqual([
      'FROM a',
      'FROM b',
      'KEEP k',
      'WHERE k IN (FROM b | KEEP k)',
    ]);
  });

  it('reaches the commands of subqueries inside subqueries', () => {
    const query = 'FROM (FROM (FROM logs | LIMIT 5))';
    const nestedHeat = heatOf(query, [
      { operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 5' }, nanos: 10 },
    ]);

    expect(
      nestedHeat.commands.map(({ command, subquery, share }) => [command.text, subquery, share])
    ).toEqual([
      ['FROM logs', 0, 0],
      ['LIMIT 5', 0, 1],
    ]);
  });

  it('numbers a subquery inside another before it, so the numbers read from the top', () => {
    const query =
      'FROM (FROM (FROM logs | WHERE a > 1 | LIMIT 5) | STATS c = COUNT(*) BY a) | SORT c DESC';
    const orderHeat = heatOf(query, [
      { operator: 'LimitOperator', node: { id: '1', text: 'LIMIT 5' }, nanos: 10 },
      {
        operator: 'HashAggregationOperator',
        node: { id: '2', text: 'STATS c = COUNT(*) BY a' },
        nanos: 20,
      },
      { operator: 'TopNOperator', node: { id: '3', text: 'SORT c DESC' }, nanos: 30 },
    ]);

    expect(orderHeat.commands.map(({ command, subquery }) => [command.name, subquery])).toEqual([
      ['FROM', 0],
      ['WHERE', 0],
      ['LIMIT', 0],
      ['STATS', 1],
      ['SORT', undefined],
    ]);
  });
});
