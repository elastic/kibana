/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { layoutGraphWithLanes } from '../layout_graph_with_lanes';
import type { DagEdge, DagNode, DagReservedLane } from '../types';

const node = (id: string): DagNode => ({ id, width: 300, height: 64 });
const edge = (id: string, source: string, target: string): DagEdge => ({ id, source, target });

const run = (lanes: readonly DagReservedLane[], nodes: readonly DagNode[] = defaultNodes) =>
  layoutGraphWithLanes(nodes, defaultEdges, lanes, 'TB', 50, 70);

const defaultNodes = [node('s1'), node('s2'), node('a'), node('b'), node('c')];
const defaultEdges = [edge('s1-s2', 's1', 's2'), edge('s2-a', 's2', 'a'), edge('a-b', 'a', 'b')];

describe('layoutGraphWithLanes — lane validation', () => {
  it('accepts a well-formed nested lane chain', () => {
    expect(() =>
      run([
        { nodeIds: ['a', 'b'], depth: 0, ownerId: 's2' },
        { nodeIds: ['c'], depth: 1, ownerId: 'a' },
      ])
    ).not.toThrow();
  });

  it('throws when a node appears in two lanes', () => {
    expect(() =>
      run([
        { nodeIds: ['a', 'b'], depth: 0, ownerId: 's1' },
        { nodeIds: ['b', 'c'], depth: 0, ownerId: 's2' },
      ])
    ).toThrow(/"b".*two lanes/);
  });

  it('throws when a lane owner is inside its own lane', () => {
    expect(() => run([{ nodeIds: ['a', 'b'], depth: 1, ownerId: 'a' }])).toThrow(
      /owner "a".*own lane/
    );
  });

  it('throws when lanes own each other cyclically', () => {
    expect(() =>
      run([
        { nodeIds: ['a'], depth: 1, ownerId: 'b' },
        { nodeIds: ['b'], depth: 1, ownerId: 'a' },
      ])
    ).toThrow(/cycle/i);
  });

  it('throws when a lane owned by a spine node has a non-zero depth', () => {
    expect(() => run([{ nodeIds: ['a', 'b'], depth: 1, ownerId: 's2' }])).toThrow(
      /spine node "s2".*depth 1/
    );
  });
});

describe('layoutGraphWithLanes — nested lane cascade', () => {
  it('cascades nested lanes and pushes in-lane successors past them', () => {
    const nodes = ['s1', 's2', 's3', 's4', 'a1', 'a2', 'a3', 'b1', 'b2', 'c1'].map(node);
    const edges = [
      edge('s1-s2', 's1', 's2'),
      edge('s2-s3', 's2', 's3'),
      edge('s3-s4', 's3', 's4'),
      edge('a1-a2', 'a1', 'a2'),
      edge('a2-a3', 'a2', 'a3'),
      edge('b1-b2', 'b1', 'b2'),
      edge('s2-a1', 's2', 'a1'),
      edge('a1-b1', 'a1', 'b1'),
      edge('b2-a2', 'b2', 'a2'),
      edge('a3-s4', 'a3', 's4'),
      edge('s3-c1', 's3', 'c1'),
    ];
    const lanes: DagReservedLane[] = [
      { nodeIds: ['a1', 'a2', 'a3'], depth: 0, ownerId: 's2' },
      { nodeIds: ['b1', 'b2'], depth: 1, ownerId: 'a1' },
      { nodeIds: ['c1'], depth: 0, ownerId: 's3' },
    ];

    const result = layoutGraphWithLanes(nodes, edges, lanes, 'TB', 50, 70);

    // a2 is the in-lane successor of a1 (which owns the nested lane b1-b2): it
    // starts one rank below b2's end (536 + 64 + 70), and s3 clears all of lane a.
    expect(
      result.nodes.map(({ id, x, y, crossPinned }) => [id, x, y, crossPinned ?? false])
    ).toEqual([
      ['s1', 0, 0, false],
      ['s2', 0, 134, false],
      ['s3', 0, 938, false],
      ['s4', 0, 1206, false],
      ['a1', 350, 268, true],
      ['a2', 350, 670, true],
      ['a3', 350, 804, true],
      ['b1', 700, 402, true],
      ['b2', 700, 536, true],
      ['c1', 350, 1072, true],
    ]);
    expect(result.lanePlacements).toEqual([
      { ownerId: 's2', crossStart: 350, crossEnd: 650, mainStart: 268, mainEnd: 868 },
      { ownerId: 's3', crossStart: 350, crossEnd: 650, mainStart: 1072, mainEnd: 1136 },
      { ownerId: 'a1', crossStart: 700, crossEnd: 1000, mainStart: 402, mainEnd: 600 },
    ]);
  });
});

describe('layoutGraphWithLanes — scaling', () => {
  it('lays out a 2k-node graph with hundreds of lanes without scanning the input per lane node', () => {
    const spineLength = 600;
    const laneSize = 4;
    const nodes: DagNode[] = [];
    const edges: DagEdge[] = [];
    const lanes: DagReservedLane[] = [];
    for (let i = 0; i < spineLength; i++) {
      nodes.push(node(`s${i}`));
      if (i > 0) edges.push(edge(`s${i - 1}-s${i}`, `s${i - 1}`, `s${i}`));
      if (i % 2 === 0) {
        const nodeIds = Array.from({ length: laneSize }, (_, k) => `l${i}_${k}`);
        for (const id of nodeIds) nodes.push(node(id));
        nodeIds
          .slice(1)
          .forEach((id, k) => edges.push(edge(`${nodeIds[k]}-${id}`, nodeIds[k], id)));
        lanes.push({ nodeIds, depth: 0, ownerId: `s${i}` });
      }
    }
    const findSpy = jest.spyOn(nodes, 'find');

    const result = layoutGraphWithLanes(nodes, edges, lanes, 'TB', 50, 70);

    // Lane nodes are resolved through an id -> node map, not `nodes.find` per lane node.
    expect(findSpy).not.toHaveBeenCalled();
    expect(result.nodes).toHaveLength(nodes.length);
    expect(result.lanePlacements).toHaveLength(lanes.length);
  });
});
