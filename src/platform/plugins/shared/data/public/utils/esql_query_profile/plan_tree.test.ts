/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { buildPlanTree, parsePlanText } from './plan_tree';
import type { PlanNode } from './plan_tree';

// The plan of a data node. ES wraps long lines in the middle of an id, as in `#\n4`.
const dataPlan = (wrap: number) =>
  [
    'ExchangeSinkExec[[a{f}#1, $$c$count{r}#2],true]',
    '\\_AggregateExec[[a{f}#1],[COUNT(*) AS c#3, a{f}#1],INITIAL,[a{f}#1, $$c$count{r}#',
    `${wrap}]]`,
    '  \\_FieldExtractExec[[a{f}#1]<[],[],[]>,_doc{f}#5]',
    '    \\_EsQueryExec[logs-*], indexMode[standard], [_doc{f}#5], limit[] queryBuilderAndTags [[QueryBuilderAndTags[query={',
    '  "range" : { "x" : 1 }',
    '}, tags=[]]]]',
  ].join('\n');

const finalPlan = [
  'OutputExec[x@1]',
  '\\_TopNExec[[Order[c{r}#3,DESC,FIRST]],1000[INTEGER],1032]',
  '  \\_ExchangeSourceExec[[a{f}#1, c{r}#3],false]',
].join('\n');

const op = (operator: string, status: Record<string, unknown>) => ({ operator, status });
let tick = 0;
const driver = (description: string, operators: ReturnType<typeof op>[]) => {
  tick += 1;
  return { description, start_millis: 1_000 + tick, stop_millis: 1_050 + tick, operators };
};

const dataDriver = (nanos: number) =>
  driver('data', [
    op('LuceneSourceOperator', { process_nanos: nanos, rows_emitted: 100 }),
    op('ValuesSourceReaderOperator[fields = [a]]', {
      process_nanos: nanos * 4,
      rows_received: 100,
      rows_emitted: 100,
    }),
    op('HashAggregationOperator[mode=INITIAL]', {
      hash_nanos: nanos * 2,
      rows_received: 100,
      rows_emitted: 10,
    }),
    op('ExchangeSinkOperator', { rows_received: 10 }),
  ]);

const finalDriver = () =>
  driver('final', [
    op('ExchangeSourceOperator', { rows_emitted: 20 }),
    op('TopNOperator', { receive_nanos: 500_000, rows_received: 20, rows_emitted: 5 }),
    op('OutputOperator', {}),
  ]);

const names = (node: PlanNode): string[] => [node.label, ...node.children.flatMap(names)];

describe('parsePlanText', () => {
  it('reads the nodes and their children from the indentation', () => {
    const root = parsePlanText(dataPlan(4));

    expect(root?.name).toBe('ExchangeSinkExec');
    expect(root?.children.map((child) => child.name)).toEqual(['AggregateExec']);
    expect(root?.children[0].children[0].children.map((child) => child.name)).toEqual([
      'EsQueryExec',
    ]);
  });

  it('joins the lines the printer wrapped, even in the middle of an id, to the node before them', () => {
    const root = parsePlanText(dataPlan(4));
    const aggregate = root?.children[0];

    expect(aggregate?.details).toContain('$$c$count{r}#4]]');
    // The query of the search has lines of its own, and they stay with the search.
    const search = aggregate?.children[0].children[0];
    expect(search?.name).toBe('EsQueryExec');
    expect(search?.details).toContain('"range"');
  });

  it('gives a node with several children all of them', () => {
    const root = parsePlanText(['JoinExec[x]', '\\_LeftExec', '\\_RightExec[y]'].join('\n'));

    expect(root?.children.map((child) => child.name)).toEqual(['LeftExec', 'RightExec']);
  });

  it('has nothing for an empty plan', () => {
    expect(parsePlanText('')).toBeUndefined();
  });
});

describe('buildPlanTree', () => {
  it('joins the data plan to the exchange of the plan that reads it, with the time of each node', () => {
    tick = 0;
    const view = aggregateEsqlProfile({
      drivers: [dataDriver(1_000_000), finalDriver()],
      plans: [
        { description: 'data', plan: dataPlan(4) },
        { description: 'final', plan: finalPlan },
      ],
    });

    const tree = buildPlanTree(view);

    expect(tree && names(tree.root)).toEqual([
      'Output',
      'TopN',
      'ExchangeSource',
      'ExchangeSink',
      'Aggregate · INITIAL',
      'FieldExtract',
      'EsQuery logs-*',
    ]);
    // The data operators are walked from the sink, so each node gets its own: the sink and the
    // source took no time, and the aggregation fed by the reader took twice the lucene time.
    const byLabel = new Map<string, PlanNode>();
    const collect = (node: PlanNode) => {
      byLabel.set(node.label, node);
      node.children.forEach(collect);
    };
    if (tree) {
      collect(tree.root);
    }
    expect(byLabel.get('EsQuery logs-*')?.selfNanos).toBe(1_000_000);
    expect(byLabel.get('FieldExtract')?.selfNanos).toBe(4_000_000);
    expect(byLabel.get('Aggregate · INITIAL')?.selfNanos).toBe(2_000_000);
    expect(byLabel.get('TopN')?.selfNanos).toBe(500_000);
    // A node's time includes everything that feeds it.
    expect(byLabel.get('Aggregate · INITIAL')?.inclusiveNanos).toBe(7_000_000);
    expect(tree?.root.inclusiveNanos).toBe(7_500_000);
    expect(tree?.totalNanos).toBe(7_500_000);
  });

  it('counts the plan of a stage once, however many nodes it ran on, and adds up their operators', () => {
    tick = 0;
    const view = aggregateEsqlProfile({
      drivers: [dataDriver(1_000_000), dataDriver(1_000_000), finalDriver()],
      plans: [
        // Two copies, printed with their ids wrapped in different places.
        { description: 'data', plan: dataPlan(4) },
        { description: 'data', plan: dataPlan(7) },
        { description: 'final', plan: finalPlan },
      ],
    });

    const tree = buildPlanTree(view);
    const operatorTotal = view.operators.reduce((sum, operator) => sum + operator.processNanos, 0);

    expect(tree && names(tree.root).filter((label) => label === 'FieldExtract')).toHaveLength(1);
    expect(tree?.totalNanos).toBe(operatorTotal);
    expect(tree?.totalNanos).toBe(14_500_000);
  });

  it('joins each subquery to the outer query, in the order they are written', () => {
    tick = 0;
    const view = aggregateEsqlProfile({
      drivers: [
        dataDriver(1_000_000),
        driver('subplan-1.final', [op('ExchangeSourceOperator', { rows_emitted: 3 })]),
        dataDriver(3_000_000),
        driver('subplan-0.final', [op('ExchangeSourceOperator', { rows_emitted: 4 })]),
        driver('main.final', [
          op('ExchangeSourceOperator', { rows_emitted: 7 }),
          op('TopNOperator', { receive_nanos: 500_000, rows_received: 7, rows_emitted: 7 }),
        ]),
      ],
      plans: [
        { description: 'data', plan: dataPlan(4) },
        {
          description: 'subplan-1.final',
          plan: '\\_NothingExec'.slice(2) + '\n\\_ExchangeSourceExec',
        },
        { description: 'data', plan: dataPlan(5) },
        { description: 'subplan-0.final', plan: 'OutputExec\n\\_ExchangeSourceExec' },
        { description: 'main.final', plan: finalPlan },
      ],
    });

    const tree = buildPlanTree(view);
    const outerSource = tree?.root.children[0].children[0];

    expect(outerSource?.name).toBe('ExchangeSourceExec');
    // The first subquery is first, whatever order the plans came in, and it is the busy one.
    expect(outerSource?.children.map((child) => child.inclusiveNanos)).toEqual([
      3_000_000 + 12_000_000 + 6_000_000,
      1_000_000 + 4_000_000 + 2_000_000,
    ]);
  });

  it('gives a node no time, and no operator, when nothing in the profile ran as it', () => {
    tick = 0;
    const view = aggregateEsqlProfile({
      drivers: [
        driver('data', [
          op('LuceneSourceOperator', { process_nanos: 1_000_000, rows_emitted: 100 }),
          op('ExchangeSinkOperator', { rows_received: 10 }),
        ]),
      ],
      plans: [{ description: 'data', plan: dataPlan(4) }],
    });

    const tree = buildPlanTree(view);
    const missing: string[] = [];
    const collect = (node: PlanNode) => {
      if (!node.hasOperator) {
        missing.push(node.label);
      }
      node.children.forEach(collect);
    };
    if (tree) {
      collect(tree.root);
    }

    // There is no reader or aggregation in these operators, so those nodes have none.
    expect(missing).toEqual(['Aggregate · INITIAL', 'FieldExtract']);
  });

  it('has no tree without a plan, or when no operator reports a time', () => {
    tick = 0;
    expect(buildPlanTree(aggregateEsqlProfile(undefined))).toBeUndefined();
    expect(
      buildPlanTree(
        aggregateEsqlProfile({
          drivers: [driver('data', [op('ExchangeSinkOperator', { rows_received: 1 })])],
          plans: [{ description: 'data', plan: dataPlan(4) }],
        })
      )
    ).toBeUndefined();
  });

  it('cleans the detail of a node, without ids or markers', () => {
    tick = 0;
    const view = aggregateEsqlProfile({
      drivers: [dataDriver(1_000_000)],
      plans: [{ description: 'data', plan: dataPlan(4) }],
    });

    const detail = buildPlanTree(view)?.root.children[0].detail ?? '';

    expect(detail).not.toMatch(/#\d/);
    expect(detail).not.toMatch(/\{f\}/);
    expect(detail).toContain('COUNT(*) AS c');
  });
});
