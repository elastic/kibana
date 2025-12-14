/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { WorkflowGraph } from '../workflow_graph';

describe('getStepNode', () => {
  it('should find a regular step node by its step ID', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'my-step',
          type: 'http',
          with: { url: 'https://example.com', method: 'GET' },
        },
      ],
    });

    const node = workflowGraph.getStepNode('my-step');

    expect(node).toBeDefined();
    expect(node?.stepId).toBe('my-step');
    expect(node?.type).toBe('http');
  });

  it('should find a foreach step node with enterForeach_ prefix', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'loop',
          type: 'foreach',
          items: [1, 2, 3],
          steps: [
            {
              name: 'inner-step',
              type: 'http',
              with: { url: 'https://example.com', method: 'GET' },
            },
          ],
        },
      ],
    });

    const node = workflowGraph.getStepNode('loop');

    expect(node).toBeDefined();
    expect(node?.stepId).toBe('loop');
    expect(node?.type).toBe('enter-foreach');
  });

  it('should find an if step node with enterIf_ prefix', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'conditional',
          type: 'if',
          condition: 'true',
          steps: [
            {
              name: 'inner-step',
              type: 'http',
              with: { url: 'https://example.com', method: 'GET' },
            },
          ],
        },
      ],
    });

    const node = workflowGraph.getStepNode('conditional');

    expect(node).toBeDefined();
    expect(node?.stepId).toBe('conditional');
    expect(node?.type).toBe('enter-if');
  });

  it('should return undefined for non-existent step', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'my-step',
          type: 'http',
          with: { url: 'https://example.com', method: 'GET' },
        },
      ],
    });

    const node = workflowGraph.getStepNode('non-existent-step');

    expect(node).toBeUndefined();
  });

  it('should find steps with retry configuration', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'retry-step',
          type: 'http',
          with: { url: 'https://example.com', method: 'GET' },
          retry: { count: 3 },
        },
      ],
    });

    const node = workflowGraph.getStepNode('retry-step');

    expect(node).toBeDefined();
    expect(node?.stepId).toBe('retry-step');
  });

  it('should find steps with on-failure configuration', () => {
    const workflowGraph = WorkflowGraph.fromWorkflowDefinition({
      trigger: { event: 'manual' },
      steps: [
        {
          name: 'failure-step',
          type: 'http',
          with: { url: 'https://example.com', method: 'GET' },
          'on-failure': {
            steps: [
              {
                name: 'fallback',
                type: 'http',
                with: { url: 'https://fallback.com', method: 'GET' },
              },
            ],
          },
        },
      ],
    });

    const node = workflowGraph.getStepNode('failure-step');

    expect(node).toBeDefined();
    expect(node?.stepId).toBe('failure-step');
  });
});
