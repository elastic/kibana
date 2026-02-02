/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getWorkflowGraph } from './get_workflow_graph';

describe('getWorkflowGraph', () => {
  it('should return the correct graph', () => {
    const definition = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [
        {
          type: 'manual' as const,
        },
      ],
      steps: [
        {
          name: 'first-step',
          type: 'console.log',
          with: {
            message: 'Hello, world!',
          },
        },
      ],
    };
    const workflowGraph = getWorkflowGraph(definition);

    expect(workflowGraph.nodes().length).toBe(2);
    expect(workflowGraph.edges().length).toBe(1);

    expect(workflowGraph.node('manual').type).toBe('trigger');
    expect(workflowGraph.node('first-step').type).toBe('action');

    expect(workflowGraph.hasEdge('manual', 'first-step')).toBe(true);
  });

  it('should return the correct graph with a nested step', () => {
    const definition = {
      version: '1' as const,
      name: 'test-workflow',
      enabled: true,
      triggers: [
        {
          type: 'manual' as const,
        },
      ],
      steps: [
        {
          name: 'first-step',
          type: 'console.log',
          with: {
            message: 'Hello, world!',
          },
        },
        {
          name: 'if-split',
          type: 'if',
          condition: '1 > 0',
          steps: [
            {
              name: 'if-true',
              type: 'console.log',
              with: {
                message: 'If true',
              },
            },
          ],
          else: [
            {
              name: 'if-false',
              type: 'console.log',
              with: {
                message: 'If false',
              },
            },
          ],
        },
      ],
    };
    const workflowGraph = getWorkflowGraph(definition);

    expect(workflowGraph.nodes().length).toBe(5);
    expect(workflowGraph.edges().length).toBe(4);

    expect(workflowGraph.node('manual').type).toBe('trigger');
    expect(workflowGraph.node('first-step').type).toBe('action');
    expect(workflowGraph.node('if-split').type).toBe('if');
    expect(workflowGraph.node('if-true').type).toBe('action');
    expect(workflowGraph.node('if-false').type).toBe('action');

    expect(workflowGraph.hasEdge('manual', 'first-step')).toBe(true);
    expect(workflowGraph.hasEdge('first-step', 'if-split')).toBe(true);
    expect(workflowGraph.hasEdge('if-split', 'if-true')).toBe(true);
    expect(workflowGraph.hasEdge('if-split', 'if-false')).toBe(true);
  });
});
