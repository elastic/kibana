/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { graphlib } from '@dagrejs/dagre';
import { getAllPredecessors, getTriggerLabel } from './graph_utils';

type MockGraph = Pick<graphlib.Graph, 'predecessors'>;

const createMockGraph = (adjacency: Record<string, string[] | undefined>): MockGraph => ({
  predecessors: jest.fn((nodeId: string) => adjacency[nodeId]),
});

describe('getAllPredecessors', () => {
  it('returns empty array when node has no predecessors', () => {
    const graph = createMockGraph({ A: [] });
    expect(getAllPredecessors(graph as graphlib.Graph, 'A')).toEqual([]);
  });

  it('returns empty array when predecessors returns undefined (node not in graph)', () => {
    const graph = createMockGraph({ A: undefined });
    expect(getAllPredecessors(graph as graphlib.Graph, 'A')).toEqual([]);
  });

  it('returns direct predecessors', () => {
    const graph = createMockGraph({
      C: ['B'],
      B: [],
    });
    expect(getAllPredecessors(graph as graphlib.Graph, 'C')).toEqual(['B']);
  });

  it('returns all transitive predecessors in a linear chain', () => {
    // A -> B -> C -> D
    const graph = createMockGraph({
      D: ['C'],
      C: ['B'],
      B: ['A'],
      A: [],
    });
    const result = getAllPredecessors(graph as graphlib.Graph, 'D');
    expect(result).toContain('C');
    expect(result).toContain('B');
    expect(result).toContain('A');
    expect(result).toHaveLength(3);
  });

  it('returns all predecessors in a diamond graph', () => {
    //   A
    //  / \
    // B   C
    //  \ /
    //   D
    const graph = createMockGraph({
      D: ['B', 'C'],
      B: ['A'],
      C: ['A'],
      A: [],
    });
    const result = getAllPredecessors(graph as graphlib.Graph, 'D');
    expect(result).toContain('B');
    expect(result).toContain('C');
    expect(result).toContain('A');
    // A appears twice (once through B, once through C) because flatMap collects all
    expect(result.filter((n) => n === 'A')).toHaveLength(2);
  });

  it('handles node with multiple direct predecessors', () => {
    const graph = createMockGraph({
      Z: ['X', 'Y'],
      X: [],
      Y: [],
    });
    const result = getAllPredecessors(graph as graphlib.Graph, 'Z');
    expect(result).toEqual(['X', 'Y']);
  });
});

describe('getTriggerLabel', () => {
  it.each([
    ['manual', 'Manual'],
    ['alert', 'Alert'],
    ['scheduled', 'Scheduled'],
  ])('returns correct label for known trigger type "%s"', (input, expected) => {
    expect(getTriggerLabel(input)).toBe(expected);
  });

  it('returns the raw trigger type string for unknown types', () => {
    expect(getTriggerLabel('webhook')).toBe('webhook');
    expect(getTriggerLabel('custom')).toBe('custom');
    expect(getTriggerLabel('')).toBe('');
  });
});
