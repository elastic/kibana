/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { WorkflowStepExecutionDto, WorkflowYaml } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import { buildStepExecutionsTree } from './build_step_executions_tree';

describe('buildStepExecutionsTree', () => {
  it('should build the step executions tree from a workflow definition, workflow execution status and step executions', () => {
    const workflowDefinition: WorkflowYaml = {
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
    const mockCommonProps = {
      workflowRunId: '1',
      workflowId: '1',
      startedAt: '2021-01-01T00:00:00Z',
      completedAt: '2021-01-01T00:00:00Z',
      executionTimeMs: 1000,
      error: null,
      output: null,
      input: null,
    };
    const workflowExecutionStatus = ExecutionStatus.COMPLETED;
    const stepExecutions: WorkflowStepExecutionDto[] = [
      {
        id: '1',
        stepId: 'console-step',
        status: ExecutionStatus.COMPLETED,
        topologicalIndex: 0,
        executionIndex: 0,
        path: [],
        ...mockCommonProps,
      },
      {
        id: '2',
        stepId: 'if-step',
        status: ExecutionStatus.COMPLETED,
        topologicalIndex: 0,
        executionIndex: 0,
        path: [],
        ...mockCommonProps,
      },
      {
        id: '3',
        stepId: 'inner-console-step',
        status: ExecutionStatus.COMPLETED,
        topologicalIndex: 0,
        executionIndex: 0,
        path: ['if-step', 'true'],
        ...mockCommonProps,
      },
      {
        id: '4',
        stepId: 'foreach-step',
        status: ExecutionStatus.RUNNING,
        topologicalIndex: 0,
        executionIndex: 0,
        path: ['if-step', 'true'],
        ...mockCommonProps,
      },
      {
        id: '5',
        stepId: 'inner-inner-console-step',
        status: ExecutionStatus.COMPLETED,
        path: ['if-step', 'true', 'foreach-step', '0'],
        topologicalIndex: 0,
        executionIndex: 0,
        ...mockCommonProps,
      },
      {
        id: '6',
        stepId: 'inner-inner-console-step',
        status: ExecutionStatus.COMPLETED,
        path: ['if-step', 'true', 'foreach-step', '1'],
        topologicalIndex: 0,
        executionIndex: 1,
        ...mockCommonProps,
      },
      {
        id: '7',
        stepId: 'inner-inner-console-step',
        status: ExecutionStatus.FAILED,
        path: ['if-step', 'true', 'foreach-step', '2'],
        topologicalIndex: 0,
        executionIndex: 2,
        ...mockCommonProps,
      },
    ];
    const stepExecutionsTree = buildStepExecutionsTree(
      workflowDefinition,
      workflowExecutionStatus,
      stepExecutions
    );
    expect(stepExecutionsTree.length).toBe(2);
    expect(stepExecutionsTree[0]).toEqual(
      expect.objectContaining({
        stepId: 'console-step',
      })
    );
    expect(stepExecutionsTree[1]).toEqual(
      expect.objectContaining({
        stepId: 'if-step',
      })
    );
    expect(stepExecutionsTree[1].children.length).toBe(1);
    expect(stepExecutionsTree[1].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'if-step:true',
      })
    );
    expect(stepExecutionsTree[1].children[0].children.length).toBe(2);
    expect(stepExecutionsTree[1].children[0].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'inner-console-step',
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1]).toEqual(
      expect.objectContaining({
        stepId: 'foreach-step',
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children.length).toBe(3);
    expect(stepExecutionsTree[1].children[0].children[1].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'foreach-step:0',
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children[0].children.length).toBe(1);
    expect(stepExecutionsTree[1].children[0].children[1].children[0].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'inner-inner-console-step',
        executionIndex: 0,
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children[1]).toEqual(
      expect.objectContaining({
        stepId: 'foreach-step:1',
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children[1].children.length).toBe(1);
    expect(stepExecutionsTree[1].children[0].children[1].children[1].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'inner-inner-console-step',
        executionIndex: 1,
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children[2]).toEqual(
      expect.objectContaining({
        stepId: 'foreach-step:2',
      })
    );
    expect(stepExecutionsTree[1].children[0].children[1].children[2].children.length).toBe(1);
    expect(stepExecutionsTree[1].children[0].children[1].children[2].children[0]).toEqual(
      expect.objectContaining({
        stepId: 'inner-inner-console-step',
        executionIndex: 2,
      })
    );
  });
});
