/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { planNodeKey, readPlanNodeSources } from './plan_node_sources';

describe('readPlanNodeSources', () => {
  it('reads the source of every node of a plan, however deep, by its node and id', () => {
    const sources = readPlanNodeSources([
      {
        node_name: 'node-a',
        plan_json: {
          id: '1',
          source: { line: null, column: null, text: null, view: null },
          children: [
            {
              id: '2',
              source: { line: 1, column: 1, text: 'FROM logs', view: null },
              children: [{ id: '3', source: { line: 1, column: 12, text: 'LIMIT 5', view: null } }],
            },
          ],
        },
      },
    ]);

    expect(sources).toEqual({
      [planNodeKey('node-a', '2')]: { line: 1, column: 1, text: 'FROM logs' },
      [planNodeKey('node-a', '3')]: { line: 1, column: 12, text: 'LIMIT 5' },
    });
  });

  it('skips nodes the planner made, nodes from a view, and plans that have no JSON', () => {
    const sources = readPlanNodeSources([
      {
        node_name: 'node-a',
        plan_json: {
          id: '1',
          source: { line: 1, column: 1, text: 'FROM people', view: 'people_view' },
          children: [{ id: '2', source: { line: null, column: null, text: null, view: null } }],
        },
      },
      { node_name: 'node-b' },
    ]);

    expect(sources).toEqual({});
  });
});
