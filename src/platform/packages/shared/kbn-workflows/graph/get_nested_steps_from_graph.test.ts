/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { convertToWorkflowGraph } from './build_execution_graph/build_execution_graph';
import type { WorkflowYaml } from '../spec/schema';
import { getNestedStepsFromGraph } from './get_nested_steps_from_graph';

describe('getNestedStepsFromGraph', () => {
  const workflowDefinition: WorkflowYaml = {
    name: 'test-workflow',
    version: '1',
    enabled: true,
    triggers: [],
    steps: [
      {
        name: 'http-1',
        type: 'http',
        with: {
          url: 'https://example.com',
          method: 'GET',
          headers: {},
        },
      },
      {
        name: 'foreach-1',
        type: 'foreach',
        foreach: '["item1", "item2", "item3"]',
        steps: [
          {
            name: 'http-2',
            type: 'http',
          },
        ],
      },
      {
        name: 'http-3',
        type: 'http',
        with: {
          url: 'https://example.com',
          method: 'GET',
          headers: {},
        },
      },
    ],
  };
  it('should return the correct nested steps from the graph', () => {
    const graph = convertToWorkflowGraph(workflowDefinition);
    const nestedSteps = getNestedStepsFromGraph(graph);
    expect(nestedSteps).toEqual([
      {
        stepId: 'http-1',
        stepType: 'http',
        topologicalIndex: 0,
        executionIndex: 0,
        children: [],
      },
      {
        stepId: 'foreach-1',
        stepType: 'enter-foreach',
        topologicalIndex: 1,
        executionIndex: 0,
        children: [
          {
            stepId: 'http-2',
            stepType: 'http',
            topologicalIndex: 1,
            executionIndex: 0,
            children: [],
          },
        ],
      },
      {
        stepId: 'http-3',
        stepType: 'http',
        topologicalIndex: 2,
        executionIndex: 0,
        children: [],
      },
    ]);
  });
});
