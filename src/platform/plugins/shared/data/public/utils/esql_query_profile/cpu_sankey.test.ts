/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { aggregateEsqlProfile } from './aggregate_esql_profile';
import { buildCpuSankey, layoutSankey } from './cpu_sankey';

const op = (operator: string, status: Record<string, unknown>) => ({ operator, status });
let tick = 0;
const driver = (
  description: string,
  nodeName: string | undefined,
  operators: ReturnType<typeof op>[]
) => {
  tick += 1;
  return {
    description,
    node_name: nodeName,
    start_millis: 1_000 + tick,
    stop_millis: 1_050 + tick,
    operators,
  };
};

describe('buildCpuSankey', () => {
  const view = aggregateEsqlProfile({
    drivers: [
      driver('data', 'node-a', [
        op('LuceneSourceOperator', { process_nanos: 6_000_000 }),
        op('HashAggregationOperator', { hash_nanos: 3_000_000 }),
        op('ExchangeSinkOperator', {}),
      ]),
      driver('data', 'node-b', [
        op('LuceneSourceOperator', { process_nanos: 2_000_000 }),
        op('HashAggregationOperator', { hash_nanos: 1_000_000 }),
      ]),
      driver('final', 'node-a', [op('TopNOperator', { receive_nanos: 1_000_000 })]),
    ],
  });

  it('breaks the CPU time down by node, driver and kind of operator', () => {
    const sankey = buildCpuSankey(view);
    const labels = (layer: number) =>
      sankey?.nodes
        .filter((node) => node.layer === layer)
        .map((node) => [node.label, node.value])
        .sort();

    expect(labels(0)).toEqual([
      ['node-a', 10_000_000],
      ['node-b', 3_000_000],
    ]);
    expect(labels(1)).toEqual([
      ['data_1', 9_000_000],
      ['data_2', 3_000_000],
      ['final_1', 1_000_000],
    ]);
    expect(labels(2)).toEqual([
      ['HashAggregation', 4_000_000],
      ['LuceneSource', 8_000_000],
      ['TopN', 1_000_000],
    ]);
  });

  it('adds up to the same total on every level, and leaves out operators that report no time', () => {
    const sankey = buildCpuSankey(view);
    const total = (layer: number) =>
      sankey?.nodes
        .filter((node) => node.layer === layer)
        .reduce((sum, node) => sum + node.value, 0);

    expect([total(0), total(1), total(2)]).toEqual([13_000_000, 13_000_000, 13_000_000]);
    expect(sankey?.nodes.some((node) => node.label === 'ExchangeSink')).toBe(false);
    // Every ribbon leaves one node and reaches another, with the time of the operator.
    expect(
      sankey?.links.find(
        (link) => link.source === 'driver-0' && link.target === 'operator-LuceneSource'
      )
    ).toMatchObject({ value: 6_000_000, category: 'source' });
  });

  it('folds the quiet drivers of a node into one, so a long tail does not bury the busy ones', () => {
    tick = 0;
    const many = aggregateEsqlProfile({
      drivers: Array.from({ length: 20 }, (_, index) =>
        driver('data', 'node-a', [op('LuceneSourceOperator', { process_nanos: 1_000_000 + index })])
      ),
    });

    const sankey = buildCpuSankey(many);
    const drivers = sankey?.nodes.filter((node) => node.layer === 1) ?? [];

    expect(drivers).toHaveLength(13);
    const others = drivers.find((node) => node.label === '8 more');
    expect(others?.value).toBeGreaterThan(8_000_000);
    expect(sankey?.nodes.filter((node) => node.layer === 2)).toHaveLength(1);
  });

  it('has nothing to show when no operator reports a time', () => {
    expect(buildCpuSankey(aggregateEsqlProfile(undefined))).toBeUndefined();
    expect(
      buildCpuSankey(
        aggregateEsqlProfile({ drivers: [driver('data', 'a', [op('ExchangeSinkOperator', {})])] })
      )
    ).toBeUndefined();
  });

  it('names a driver that has no node, and numbers drivers of the same kind', () => {
    tick = 0;
    const sankey = buildCpuSankey(
      aggregateEsqlProfile({
        drivers: [driver('data', undefined, [op('LuceneSourceOperator', { process_nanos: 5 })])],
      })
    );

    expect(sankey?.nodes.find((node) => node.layer === 0)?.label).toBe('cluster');
  });
});

describe('layoutSankey', () => {
  const sankey = buildCpuSankey(
    aggregateEsqlProfile({
      drivers: [
        driver('data', 'a', [
          op('LuceneSourceOperator', { process_nanos: 6_000_000 }),
          op('HashAggregationOperator', { hash_nanos: 2_000_000 }),
        ]),
        driver('data', 'a', [op('LuceneSourceOperator', { process_nanos: 2_000_000 })]),
      ],
    })
  )!;
  const layout = layoutSankey(sankey, { height: 200, padding: 8, minHeight: 2 });

  it('gives each node a height as large as its time, busiest first, without overlapping', () => {
    const drivers = layout.nodes.filter((node) => node.layer === 1).sort((a, b) => a.y - b.y);

    expect(drivers[0].value).toBeGreaterThan(drivers[1].value);
    expect(drivers[0].height).toBeGreaterThan(drivers[1].height);
    expect(drivers[1].y).toBeGreaterThanOrEqual(drivers[0].y + drivers[0].height);
    // One scale for every layer, so the same time is as tall everywhere.
    const [node] = layout.nodes.filter((candidate) => candidate.layer === 0);
    expect(node.height / node.value).toBeCloseTo(drivers[0].height / drivers[0].value);
  });

  it('lays ribbons inside their nodes, one after the other', () => {
    const byId = new Map(layout.nodes.map((node) => [node.id, node]));
    layout.links.forEach((link) => {
      const source = byId.get(link.source)!;
      const target = byId.get(link.target)!;
      expect(link.sourceY).toBeGreaterThanOrEqual(source.y - 1e-9);
      expect(link.sourceY + link.thickness).toBeLessThanOrEqual(source.y + source.height + 1e-9);
      expect(link.targetY).toBeGreaterThanOrEqual(target.y - 1e-9);
      expect(link.targetY + link.thickness).toBeLessThanOrEqual(target.y + target.height + 1e-9);
    });
    const leavingA = layout.links
      .filter((link) => link.source === 'node-a')
      .sort((a, b) => a.sourceY - b.sourceY);
    expect(leavingA[1].sourceY).toBeCloseTo(leavingA[0].sourceY + leavingA[0].thickness);
  });

  it('asks for more height when minimum heights add up past what was asked for', () => {
    const tall = layoutSankey(sankey, { height: 10, padding: 8, minHeight: 6 });

    expect(tall.height).toBeGreaterThan(10);
  });
});
