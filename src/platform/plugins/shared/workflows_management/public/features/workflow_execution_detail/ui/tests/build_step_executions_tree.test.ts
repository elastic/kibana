/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowStepExecutionDto } from '@kbn/workflows';
import { buildStepExecutionsTree } from '../build_step_executions_tree';

// Helper function to create a valid WorkflowStepExecutionDto with all required properties
const createStepExecution = (
  overrides: Partial<WorkflowStepExecutionDto> = {}
): WorkflowStepExecutionDto => ({
  id: 'default-id',
  stepId: 'default-step',
  stepType: 'action',
  scopeStack: [],
  workflowRunId: 'workflow-run-1',
  workflowId: 'workflow-1',
  status: ExecutionStatus.COMPLETED,
  startedAt: '2023-01-01T00:00:00Z',
  topologicalIndex: 0,
  globalExecutionIndex: 0,
  stepExecutionIndex: 0,
  ...overrides,
});

describe('buildStepExecutionsTree', () => {
  describe('with empty input', () => {
    it('should return empty array when no step executions provided', () => {
      const result = buildStepExecutionsTree([]);
      expect(result).toEqual([]);
    });
  });

  describe('with single step execution', () => {
    it('should build tree with single root step', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'step-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        stepId: 'step-1',
        stepType: 'action',
        executionIndex: 0,
        stepExecutionId: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        children: [],
      });
    });

    it('should handle different execution statuses', () => {
      const testCases = [
        ExecutionStatus.PENDING,
        ExecutionStatus.RUNNING,
        ExecutionStatus.COMPLETED,
        ExecutionStatus.FAILED,
        ExecutionStatus.SKIPPED,
      ];

      testCases.forEach((status) => {
        const stepExecutions: WorkflowStepExecutionDto[] = [
          createStepExecution({
            id: 'exec-1',
            stepId: 'step-1',
            stepType: 'action',
            status,
            stepExecutionIndex: 0,
            scopeStack: [],
          }),
        ];

        const result = buildStepExecutionsTree(stepExecutions);
        expect(result[0].status).toBe(status);
      });
    });
  });

  describe('with multiple sequential steps', () => {
    it('should build tree with multiple root steps', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'step-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'step-2',
          stepType: 'action',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 1,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        stepId: 'step-1',
        stepType: 'action',
        executionIndex: 0,
        stepExecutionId: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        children: [],
      });
      expect(result[1]).toEqual({
        stepId: 'step-2',
        stepType: 'action',
        executionIndex: 1,
        stepExecutionId: 'exec-2',
        status: ExecutionStatus.RUNNING,
        children: [],
      });
    });
  });

  describe('with nested foreach steps', () => {
    let stepExecutions: WorkflowStepExecutionDto[];
    beforeEach(() => {
      stepExecutions = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'foreach-1',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'iteration-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
        }),
        createStepExecution({
          id: 'exec-3',
          stepId: 'iteration-2',
          stepType: 'action',
          status: ExecutionStatus.FAILED,
          stepExecutionIndex: 1,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '1' }],
            },
          ],
        }),
      ];
    });

    it('should configure foreach object', () => {
      const result = buildStepExecutionsTree(stepExecutions);

      expect(result[0].children).toHaveLength(2);
      expect(result[0]).toEqual(
        expect.objectContaining({
          stepId: 'foreach-1',
          stepType: 'foreach',
          executionIndex: 0,
          stepExecutionId: 'exec-1',
          status: ExecutionStatus.RUNNING,
        })
      );
    });

    it.each([0, 1])('should configure %s iteration', (testCase) => {
      const result = buildStepExecutionsTree(stepExecutions);

      expect(result[0].children[testCase]).toEqual(
        expect.objectContaining({
          stepId: testCase.toString(),
          stepType: 'foreach-iteration',
          executionIndex: 0,
          stepExecutionId: undefined,
          status: ExecutionStatus.SKIPPED,
        })
      );
      expect(result[0].children[testCase].children).toHaveLength(1);
    });

    it('should configure object inside 0 iteration', () => {
      const result = buildStepExecutionsTree(stepExecutions);

      expect(result[0].children[0].children[0]).toEqual(
        expect.objectContaining({
          stepId: `iteration-1`,
          stepType: 'action',
          executionIndex: 0,
          stepExecutionId: 'exec-2',
          status: ExecutionStatus.COMPLETED,
          children: [],
        })
      );
      expect(result[0].children[0].children).toHaveLength(1);
    });

    it('should configure object inside 1 iteration', () => {
      const result = buildStepExecutionsTree(stepExecutions);

      expect(result[0].children[1].children[0]).toEqual(
        expect.objectContaining({
          stepId: `iteration-2`,
          stepType: 'action',
          executionIndex: 1,
          stepExecutionId: 'exec-3',
          status: ExecutionStatus.FAILED,
          children: [],
        })
      );
      expect(result[0].children[1].children).toHaveLength(1);
    });
  });

  describe('with nested if/else steps', () => {
    it('should build tree with if parent and branch children', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'if-1',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'then-action',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'if-1',
              nestedScopes: [{ nodeId: 'if-1', nodeType: 'foreach', scopeId: 'true' }],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        stepId: 'if-1',
        stepType: 'if',
        executionIndex: 0,
        stepExecutionId: 'exec-1',
        status: 'completed',
        children: [
          {
            stepId: 'true',
            stepType: 'if-branch',
            executionIndex: 0,
            stepExecutionId: undefined,
            status: 'skipped',
            children: [
              {
                stepId: 'then-action',
                stepType: 'action',
                executionIndex: 0,
                stepExecutionId: 'exec-2',
                status: 'completed',
                children: [],
              },
            ],
          },
        ],
      });
    });

    it('should handle skipped branch executions', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'if-1',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        stepId: 'if-1',
        stepType: 'if',
        executionIndex: 0,
        stepExecutionId: 'exec-1',
        status: ExecutionStatus.COMPLETED,
        children: [],
      });
    });
  });

  describe('with deeply nested structures', () => {
    it('should build tree with multiple levels of nesting', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'foreach-1',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'if-1',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
        }),
        createStepExecution({
          id: 'exec-3',
          stepId: 'action-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '1' }],
            },
            {
              stepId: 'if-1',
              nestedScopes: [{ nodeId: 'if-1', nodeType: 'foreach' }],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        stepId: 'foreach-1',
        stepType: 'foreach',
        executionIndex: 0,
        stepExecutionId: 'exec-1',
        status: 'running',
        children: [
          {
            stepId: '0',
            stepType: 'foreach-iteration',
            executionIndex: 0,
            stepExecutionId: undefined,
            status: 'skipped',
            children: [
              {
                stepId: 'if-1',
                stepType: 'if',
                executionIndex: 0,
                stepExecutionId: 'exec-2',
                status: 'completed',
                children: [],
              },
            ],
          },
          {
            stepId: '1',
            stepType: 'foreach-iteration',
            executionIndex: 0,
            stepExecutionId: undefined,
            status: 'skipped',
            children: [
              {
                stepId: 'action-1',
                stepType: 'action',
                executionIndex: 0,
                stepExecutionId: 'exec-3',
                status: 'completed',
                children: [],
              },
            ],
          },
        ],
      });
    });
  });

  describe('with virtual tree nodes (missing executions)', () => {
    it('should create virtual nodes for missing foreach iterations', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'foreach-1',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'action-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [
                { nodeId: 'foreach-1', nodeType: 'foreach', scopeId: 'missing-iteration' },
              ],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0]).toEqual({
        stepId: 'missing-iteration',
        stepType: 'foreach-iteration',
        executionIndex: 0,
        stepExecutionId: undefined,
        status: ExecutionStatus.SKIPPED,
        children: [
          {
            stepId: 'action-1',
            stepType: 'action',
            executionIndex: 0,
            stepExecutionId: 'exec-2',
            status: ExecutionStatus.COMPLETED,
            children: [],
          },
        ],
      });
    });

    it('should create virtual nodes for missing if branches', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'if-1',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'action-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'if-1',
              nestedScopes: [{ nodeId: 'if-1', nodeType: 'foreach', scopeId: 'missing-branch' }],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0]).toEqual({
        stepId: 'missing-branch',
        stepType: 'if-branch',
        executionIndex: 0,
        stepExecutionId: undefined,
        status: ExecutionStatus.SKIPPED,
        children: [
          {
            stepId: 'action-1',
            stepType: 'action',
            executionIndex: 0,
            stepExecutionId: 'exec-2',
            status: ExecutionStatus.COMPLETED,
            children: [],
          },
        ],
      });
    });

    it('should create virtual nodes with unknown type for unrecognized parent types', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'custom-step',
          stepType: 'custom',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'action-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'custom-step',
              nestedScopes: [
                { nodeId: 'custom-step', nodeType: 'foreach', scopeId: 'missing-child' },
              ],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0].children).toHaveLength(1);
      expect(result[0].children[0]).toEqual({
        stepId: 'missing-child',
        stepType: 'unknown',
        executionIndex: 0,
        stepExecutionId: undefined,
        status: ExecutionStatus.SKIPPED,
        children: [
          {
            stepId: 'action-1',
            stepType: 'action',
            executionIndex: 0,
            stepExecutionId: 'exec-2',
            status: ExecutionStatus.COMPLETED,
            children: [],
          },
        ],
      });
    });
  });

  describe('with complex mixed scenarios', () => {
    it('should handle mixed step types and execution states', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'step-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'foreach-1',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 1,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-3',
          stepId: 'iteration-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
        }),
        createStepExecution({
          id: 'exec-4',
          stepId: 'if-1',
          stepType: 'if',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 2,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(3);
      expect(result[0].stepId).toBe('step-1');
      expect(result[0].children).toHaveLength(0);

      expect(result[1].stepId).toBe('foreach-1');
      expect(result[1].children).toHaveLength(1);
      expect(result[1].children[0].stepId).toBe('0');

      expect(result[2].stepId).toBe('if-1');
      expect(result[2].children).toHaveLength(0);
    });

    it('should preserve execution order and indices', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-3',
          stepId: 'step-3',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 2,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-1',
          stepId: 'step-1',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'step-2',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 1,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(3);
      // The order should be preserved as provided in the input
      expect(result[0].executionIndex).toBe(2);
      expect(result[1].executionIndex).toBe(0);
      expect(result[2].executionIndex).toBe(1);
    });
  });

  describe('edge cases', () => {
    it('should handle undefined optional fields gracefully', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'step-1',
          stepType: undefined as any,
          status: undefined as any,
          stepExecutionIndex: undefined as any,
          scopeStack: [],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        stepId: 'step-1',
        stepType: undefined,
        executionIndex: undefined,
        stepExecutionId: 'exec-1',
        status: undefined,
        children: [],
      });
    });

    it('should handle duplicate step IDs in different paths', () => {
      const stepExecutions: WorkflowStepExecutionDto[] = [
        createStepExecution({
          id: 'exec-1',
          stepId: 'action',
          stepType: 'action',
          status: ExecutionStatus.COMPLETED,
          stepExecutionIndex: 0,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-2',
          stepId: 'foreach-1',
          stepType: 'foreach',
          status: ExecutionStatus.RUNNING,
          stepExecutionIndex: 1,
          scopeStack: [],
        }),
        createStepExecution({
          id: 'exec-3',
          stepId: 'action',
          stepType: 'action',
          status: ExecutionStatus.FAILED,
          stepExecutionIndex: 0,
          scopeStack: [
            {
              stepId: 'foreach-1',
              nestedScopes: [{ nodeId: 'foreach-1', nodeType: 'foreach', scopeId: '0' }],
            },
          ],
        }),
      ];

      const result = buildStepExecutionsTree(stepExecutions);

      expect(result).toHaveLength(2);
      expect(result[0].stepId).toBe('action');
      expect(result[0].status).toBe(ExecutionStatus.COMPLETED);

      expect(result[1].stepId).toBe('foreach-1');
      expect(result[1].children).toHaveLength(1);
      expect(result[1].children[0].stepId).toBe('0');
      expect(result[1].children[0].status).toBe(ExecutionStatus.SKIPPED);
    });
  });
});
