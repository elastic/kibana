/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DependencyManager } from './dependency_manager';

describe('DependencyManager', () => {
  it('orderDependencies. Should sort topology by dependencies', () => {
    const graph = {
      N: [],
      R: [],
      A: ['B', 'C'],
      B: ['D'],
      C: ['F', 'B'],
      F: ['E'],
      E: ['D'],
      D: ['L'],
    };
    const sortedTopology = ['N', 'R', 'L', 'D', 'B', 'E', 'F', 'C', 'A'];
    expect(DependencyManager.orderDependencies(graph)).toEqual(sortedTopology);
  });

  it('should include final vertex if it has dependencies', () => {
    const graph = {
      A: [],
      B: [],
      C: ['A', 'B'],
    };
    const sortedTopology = ['A', 'B', 'C'];
    expect(DependencyManager.orderDependencies(graph)).toEqual(sortedTopology);
  });

  it('orderDependencies. Should return base topology if no depended vertices', () => {
    const graph = {
      N: [],
      R: [],
      D: undefined,
    };
    const sortedTopology = ['N', 'R', 'D'];
    expect(DependencyManager.orderDependencies(graph)).toEqual(sortedTopology);
  });

  describe('circular dependencies', () => {
    it('should detect circular dependencies and throw error with path', () => {
      const graph = {
        N: ['R'],
        R: ['A'],
        A: ['B'],
        B: ['C'],
        C: ['D'],
        D: ['E'],
        E: ['F'],
        F: ['L'],
        L: ['G'],
        G: ['N'],
      };
      const circularPath = ['G', 'L', 'F', 'E', 'D', 'C', 'B', 'A', 'R', 'N'].join(' -> ');
      const errorMessage = `Circular dependency detected while setting up services: ${circularPath}`;

      expect(() => DependencyManager.orderDependencies(graph)).toThrowError(errorMessage);
    });

    it('should detect circular dependency if circular reference is the first dependency for a vertex', () => {
      const graph = {
        A: ['B'],
        B: ['A', 'C'],
        C: [],
      };

      expect(() => DependencyManager.orderDependencies(graph)).toThrow();
    });
  });
});
