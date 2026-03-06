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
import type { ExecutionStateRepository } from '../repositories/execution_state_repository/execution_state_repository';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';

import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';
import { createMockWorkflowEventLogger } from '../workflow_event_logger/mocks';
import type { IWorkflowEventLogger } from '../workflow_event_logger/types';

describe('cancelWorkflowIfRequested', () => {
  let executionStateRepository: jest.Mocked<ExecutionStateRepository>;
  let workflowExecutionState: jest.Mocked<WorkflowExecutionState>;
  let monitoredStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;
  let workflowLogger: jest.Mocked<IWorkflowEventLogger>;
  let monitorAbortController: AbortController;
  let workflowExecution: EsWorkflowExecution;

  beforeEach(() => {
    workflowLogger = createMockWorkflowEventLogger();
    monitorAbortController = new AbortController();

    workflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      cancelRequested: false,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    executionStateRepository = {
      getWorkflowExecutions: jest.fn().mockResolvedValue({}),
    } as unknown as jest.Mocked<ExecutionStateRepository>;

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
  });

  describe('error handling', () => {
    it('should handle Elasticsearch timeout errors gracefully', async () => {
      const timeoutError = new Error('TLS handshake timeout');
      executionStateRepository.getWorkflowExecutions.mockRejectedValue(timeoutError);

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to check workflow cancellation status - continuing execution',
        timeoutError
      );
      expect(monitorAbortController.signal.aborted).toBe(false);
      expect(monitoredStepExecutionRuntime.abortController.signal.aborted).toBe(false);
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(workflowExecutionState.upsertStep).not.toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      const networkError = new Error('ECONNREFUSED: Connection refused');
      executionStateRepository.getWorkflowExecutions.mockRejectedValue(networkError);

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to check workflow cancellation status - continuing execution',
        networkError
      );
      expect(monitorAbortController.signal.aborted).toBe(false);
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
    });

    it('should handle non-Error objects gracefully', async () => {
      const stringError = 'String error message';
      executionStateRepository.getWorkflowExecutions.mockRejectedValue(stringError);

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to check workflow cancellation status - continuing execution',
        expect.any(Error)
      );

      const logCall = workflowLogger.logError.mock.calls[0];
      expect(logCall[1]).toBeInstanceOf(Error);
      expect((logCall[1] as Error).message).toBe('String error message');
    });

    it('should return early when error occurs, allowing step execution to continue', async () => {
      const error = new Error('Elasticsearch unavailable');
      executionStateRepository.getWorkflowExecutions.mockRejectedValue(error);

      const result = await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(result).toBeUndefined();
      expect(workflowExecutionState.upsertStep).not.toHaveBeenCalled();
    });
  });

  describe('normal cancellation flow', () => {
    it('should proceed with cancellation when getWorkflowExecutions returns cancelRequested=true', async () => {
      executionStateRepository.getWorkflowExecutions.mockResolvedValue({
        'test-workflow-execution-id': {
          ...workflowExecution,
          cancelRequested: true,
        },
      });

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
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
      expect(workflowLogger.logError).not.toHaveBeenCalled();
    });

    it('should return early when getWorkflowExecutions returns cancelRequested=false', async () => {
      executionStateRepository.getWorkflowExecutions.mockResolvedValue({
        'test-workflow-execution-id': workflowExecution,
      });

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(monitorAbortController.signal.aborted).toBe(false);
      expect(monitoredStepExecutionRuntime.abortController.signal.aborted).toBe(false);
      expect(workflowExecutionState.updateWorkflowExecution).not.toHaveBeenCalled();
      expect(workflowExecutionState.upsertStep).not.toHaveBeenCalled();
    });

    it('should skip repository call when cancelRequested is already true in state', async () => {
      workflowExecution.cancelRequested = true;
      workflowExecutionState.getWorkflowExecution.mockReturnValue(workflowExecution);

      await cancelWorkflowIfRequested(
        executionStateRepository,
        workflowExecutionState,
        monitoredStepExecutionRuntime,
        workflowLogger,
        monitorAbortController
      );

      expect(executionStateRepository.getWorkflowExecutions).not.toHaveBeenCalled();
      expect(monitorAbortController.signal.aborted).toBe(true);
      expect(workflowExecutionState.updateWorkflowExecution).toHaveBeenCalled();
    });
  });
});
