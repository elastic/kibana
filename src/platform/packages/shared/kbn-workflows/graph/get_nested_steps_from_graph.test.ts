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
        name: 'outer-if',
        type: 'if',
        steps: [
          {
            name: 'foreach-1',
            type: 'foreach',
            foreach: '["item1", "item2", "item3"]',
            steps: [
              {
                name: 'inner-http-1',
                type: 'http',
              },
              {
                name: 'inner-if-1',
                type: 'if',
                condition: 'a:b',
                steps: [
                  {
                    name: 'inner-foreach-1',
                    type: 'foreach',
                    foreach: '["item1", "item2", "item3"]',
                    steps: [
                      {
                        name: 'inner-inner-inner-http-1',
                        type: 'http',
                      },
                      {
                        name: 'inner-inner-inner-http-2',
                        type: 'http',
                      },
                    ],
                  },
                  {
                    name: 'inner-inner-http-1',
                    type: 'http',
                  },
                ],
              },
            ],
          },
        ],
        else: [
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
        executionIndex: 0,
        children: [],
      },
      {
        stepId: 'outer-if',
        stepType: 'enter-if',
        executionIndex: 0,
        children: [
          {
            stepId: 'foreach-1',
            stepType: 'enter-foreach',
            executionIndex: 0,
            children: [
              {
                stepId: 'inner-http-1',
                stepType: 'http',
                executionIndex: 0,
                children: [],
              },
              {
                stepId: 'inner-if-1',
                stepType: 'enter-if',
                executionIndex: 1,
                children: [
                  {
                    stepId: 'inner-foreach-1',
                    stepType: 'enter-foreach',
                    executionIndex: 0,
                    children: [
                      {
                        stepId: 'inner-inner-inner-http-1',
                        stepType: 'http',
                        executionIndex: 0,
                        children: [],
                      },
                      {
                        stepId: 'inner-inner-inner-http-2',
                        stepType: 'http',
                        executionIndex: 1,
                        children: [],
                      },
                    ],
                  },
                  {
                    stepId: 'inner-inner-http-1',
                    stepType: 'http',
                    executionIndex: 1,
                    children: [],
                  },
                ],
              },
            ],
          },
          {
            stepId: 'http-3',
            stepType: 'http',
            executionIndex: 1,
            children: [],
          },
        ],
      },
    ]);
  });
  it('should return tree with two children and, if-step having three children', () => {
    const definition: WorkflowYaml = {
      version: '1',
      name: 'Test Workflow',
      enabled: true,
      triggers: [],
      steps: [
        {
          name: 'console-step',
          type: 'console',
          with: {
            message: 'Hello from root steps!',
          },
        },
        {
          name: 'if-step',
          type: 'if',
          steps: [
            {
              name: 'inner-console-step',
              type: 'console',
              with: {
                message: 'Hello from within if true branch step!',
              },
            },
            {
              name: 'foreach-step',
              type: 'foreach',
              foreach: 'item',
              steps: [
                {
                  name: 'inner-inner-console-step',
                  type: 'console',
                  with: {
                    message: 'Hello from within foreach step!',
                  },
                },
              ],
            },
          ],
          else: [
            {
              name: 'else-console-step',
              type: 'console',
              with: {
                message: 'Hello from within if false branch step!',
              },
            },
          ],
        },
      ],
      inputs: [],
    };
    const graph = convertToWorkflowGraph(definition);
    const nestedSteps = getNestedStepsFromGraph(graph);
    expect(nestedSteps.length).toBe(2);
    expect(nestedSteps[0]).toEqual({
      stepId: 'console-step',
      stepType: 'console',
      executionIndex: 0,
      children: [],
    });
    expect(nestedSteps[1]).toEqual(
      expect.objectContaining({
        stepId: 'if-step',
      })
    );
  });
});
