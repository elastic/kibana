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
