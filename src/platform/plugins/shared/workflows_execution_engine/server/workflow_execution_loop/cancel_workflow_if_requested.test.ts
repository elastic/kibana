/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution, StackFrame } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';
import { cancelWorkflowIfRequested } from './cancel_workflow_if_requested';
import { createMockWorkflowExecutionCursor } from '../workflow_context_manager/mocks/workflow_execution_cursor.mock';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';

describe('cancelWorkflowIfRequested', () => {
  let workflowExecutionState: jest.Mocked<WorkflowExecutionState>;
  let monitoredStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let workflowExecutionCursor: ReturnType<typeof createMockWorkflowExecutionCursor>;
  let monitorAbortController: AbortController;
  let workflowExecution: EsWorkflowExecution;

  beforeEach(() => {
    monitorAbortController = new AbortController();

    workflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      cancelRequested: false,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    workflowExecutionState = {
      getWorkflowExecution: jest.fn().mockReturnValue(workflowExecution),
      updateWorkflowExecution: jest.fn(),
      getStepExecution: jest.fn(),
      upsertStep: jest.fn(),
    } as unknown as jest.Mocked<WorkflowExecutionState>;

    const mockNode = {
      id: 'node1',
      stepId: 'test-step-id',
      stepType: 'data.set',
    } as GraphNodeUnion;

    const emptyStackFrames: StackFrame[] = [];
    const scopeStack = WorkflowScopeStack.fromStackFrames(emptyStackFrames);

    monitoredStepExecutionRuntime = {
      stepExecutionId: 'test-step-execution-id',
      node: mockNode,
      scopeStack,
      abortController: new AbortController(),
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    workflowExecutionCursor = createMockWorkflowExecutionCursor();
  });

  it('returns early when cancelRequested is false', async () => {
    const result = await cancelWorkflowIfRequested(
      workflowExecutionState,
      monitoredStepExecutionRuntime,
      workflowExecutionCursor,
      monitorAbortController
    );

    expect(result).toBeUndefined();
    expect(monitorAbortController.signal.aborted).toBe(false);
    expect(monitoredStepExecutionRuntime.abortController.signal.aborted).toBe(false);
    expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    expect(workflowExecutionState.upsertStep).not.toHaveBeenCalled();
    expect(workflowExecutionCursor.stop).not.toHaveBeenCalled();
  });

  it('cancels the running step when cancelRequested is true', async () => {
    workflowExecution.cancelRequested = true;
    workflowExecutionState.getWorkflowExecution.mockReturnValue(workflowExecution);

    await cancelWorkflowIfRequested(
      workflowExecutionState,
      monitoredStepExecutionRuntime,
      workflowExecutionCursor,
      monitorAbortController
    );

    expect(monitorAbortController.signal.aborted).toBe(true);
    expect(monitoredStepExecutionRuntime.abortController.signal.aborted).toBe(true);
    expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalledWith({
      status: ExecutionStatus.CANCELLED,
    });
    expect(workflowExecutionState.upsertStep).toHaveBeenCalledWith({
      id: 'test-step-execution-id',
      status: ExecutionStatus.CANCELLED,
      stepId: 'test-step-id',
      stepType: 'data.set',
      scopeStack: [],
    });
    expect(workflowExecutionCursor.stop).toHaveBeenCalled();
  });
});
