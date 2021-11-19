/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { DependencyManager } from './dependency_manager';

describe('DependencyManager', () => {
  it('should sort', () => {
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
});
