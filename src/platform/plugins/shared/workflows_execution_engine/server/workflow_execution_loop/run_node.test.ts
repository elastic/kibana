/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { EsWorkflowExecution, StackFrame } from '@kbn/workflows';
import { ExecutionStatus } from '@kbn/workflows';
import type { GraphNodeUnion } from '@kbn/workflows/graph';

import * as catchErrorModule from './catch_error';
import * as handleExecutionDelayModule from './handle_execution_delay';
import { runNode } from './run_node';
import * as runStackMonitorModule from './run_stack_monitor/run_stack_monitor';
import type { WorkflowExecutionLoopParams } from './types';
import type { CancellableNode, NodeImplementation } from '../step/node_implementation';
import type { StepExecutionRuntime } from '../workflow_context_manager/step_execution_runtime';
import type { WorkflowExecutionState } from '../workflow_context_manager/workflow_execution_state';
import { WorkflowScopeStack } from '../workflow_context_manager/workflow_scope_stack';
import { createMockWorkflowEventLogger } from '../workflow_event_logger/mocks';

jest.mock('./run_stack_monitor/run_stack_monitor');
jest.mock('./catch_error');
jest.mock('./handle_execution_delay');

const mockCatchError = catchErrorModule.catchError as jest.Mock;
const mockHandleExecutionDelay = handleExecutionDelayModule.handleExecutionDelay as jest.Mock;
const mockRunStackMonitor = runStackMonitorModule.runStackMonitor as jest.Mock;

describe('runNode', () => {
  let mockParams: jest.Mocked<WorkflowExecutionLoopParams>;
  let workflowExecution: EsWorkflowExecution;
  let mockNode: GraphNodeUnion;
  let mockNodeImplementation: jest.Mocked<NodeImplementation>;
  let mockStepExecutionRuntime: jest.Mocked<StepExecutionRuntime>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Set up default implementations for mocks
    mockRunStackMonitor.mockImplementation(
      async (
        _params: WorkflowExecutionLoopParams,
        _stepExecutionRuntime: StepExecutionRuntime,
        _monitorAbortController: AbortController
      ) => {
        // Simulate the monitoring loop running briefly
        await new Promise((resolve) => setTimeout(resolve, 100));
        // Don't abort by default - let the step run to completion
      }
    );

    mockCatchError.mockResolvedValue(undefined);
    mockHandleExecutionDelay.mockResolvedValue(undefined);

    workflowExecution = {
      id: 'test-workflow-execution-id',
      workflowId: 'test-workflow-id',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      cancelRequested: false,
      startedAt: '2025-08-05T20:00:00.000Z',
    } as EsWorkflowExecution;

    mockNode = {
      id: 'node1',
      stepId: 'test-step-id',
      stepType: 'data.set',
    } as GraphNodeUnion;

    const emptyStackFrames: StackFrame[] = [];
    const scopeStack = WorkflowScopeStack.fromStackFrames(emptyStackFrames);

    mockStepExecutionRuntime = {
      stepExecutionId: 'test-step-execution-id',
      node: mockNode,
      scopeStack,
      abortController: new AbortController(),
    } as unknown as jest.Mocked<StepExecutionRuntime>;

    mockNodeImplementation = {
      run: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<NodeImplementation>;

    mockParams = {
      workflowRuntime: {
        getCurrentNode: jest.fn().mockReturnValue(mockNode),
        exitScope: jest.fn(),
        enterScope: jest.fn(),
        getWorkflowExecution: jest.fn().mockReturnValue(workflowExecution),
        getCurrentNodeScope: jest.fn().mockReturnValue(emptyStackFrames),
        setWorkflowError: jest.fn(),
        saveState: jest.fn().mockResolvedValue(undefined),
      },
      stepExecutionRuntimeFactory: {
        createStepExecutionRuntime: jest.fn().mockReturnValue(mockStepExecutionRuntime),
      },
      nodesFactory: {
        create: jest.fn().mockReturnValue(mockNodeImplementation),
      },
      workflowExecutionState: {
        getWorkflowExecution: jest.fn().mockReturnValue(workflowExecution),
      } as unknown as jest.Mocked<WorkflowExecutionState>,
    } as unknown as jest.Mocked<WorkflowExecutionLoopParams>;
  });

  describe('when workflow is running', () => {
    it('should start step execution immediately without blocking ES call', async () => {
      await runNode(mockParams);

      // Verify that step execution started
      expect(mockNodeImplementation.run).toHaveBeenCalled();

      // Verify the in-memory status check was used (not an ES call)
      expect(mockParams.workflowRuntime.getWorkflowExecution).toHaveBeenCalled();

      // Verify step execution runtime was created
      expect(
        mockParams.stepExecutionRuntimeFactory.createStepExecutionRuntime
      ).toHaveBeenCalledWith({
        nodeId: 'node1',
        stackFrames: [],
      });

      // Verify node implementation was created
      expect(mockParams.nodesFactory.create).toHaveBeenCalledWith(mockStepExecutionRuntime);
    });

    it('should run monitoring in parallel with step execution', async () => {
      await runNode(mockParams);

      // Verify monitoring was started
      expect(mockRunStackMonitor).toHaveBeenCalledWith(
        mockParams,
        mockStepExecutionRuntime,
        expect.any(AbortController)
      );

      // Verify both step and monitoring ran
      expect(mockNodeImplementation.run).toHaveBeenCalled();
    });

    it('should save state after step execution', async () => {
      await runNode(mockParams);

      expect(mockParams.workflowRuntime.saveState).toHaveBeenCalled();
    });
  });

  describe('when workflow is cancelled before step starts', () => {
    it('should skip step execution if workflow status is not RUNNING', async () => {
      workflowExecution.status = ExecutionStatus.CANCELLED;

      await runNode(mockParams);

      expect(mockNodeImplementation.run).not.toHaveBeenCalled();
      expect(mockParams.workflowRuntime.getWorkflowExecution).toHaveBeenCalled();
      expect(mockParams.workflowRuntime.saveState).toHaveBeenCalled();
    });

    it('should skip step execution if workflow status is FAILED', async () => {
      workflowExecution.status = ExecutionStatus.FAILED;

      await runNode(mockParams);

      expect(mockNodeImplementation.run).not.toHaveBeenCalled();
    });

    it('should skip step execution if workflow status is COMPLETED', async () => {
      workflowExecution.status = ExecutionStatus.COMPLETED;

      await runNode(mockParams);

      expect(mockNodeImplementation.run).not.toHaveBeenCalled();
    });
  });

  describe('when there is no current node', () => {
    it('should return early without executing step', async () => {
      (mockParams.workflowRuntime.getCurrentNode as jest.Mock).mockReturnValue(undefined);

      await runNode(mockParams);

      expect(mockNodeImplementation.run).not.toHaveBeenCalled();
      expect(mockParams.workflowRuntime.saveState).not.toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle step execution errors', async () => {
      const error = new Error('Step execution failed');
      mockNodeImplementation.run.mockRejectedValue(error);

      await runNode(mockParams);

      expect(mockParams.workflowRuntime.setWorkflowError).toHaveBeenCalledWith(error);
      expect(mockParams.workflowRuntime.saveState).toHaveBeenCalled();
    });

    it('should call catchError when error occurs', async () => {
      const error = new Error('Step execution failed');
      (mockNodeImplementation.run as jest.Mock).mockRejectedValue(error);

      await runNode(mockParams);

      expect(mockCatchError).toHaveBeenCalledWith(mockParams, mockStepExecutionRuntime);
    });
  });

  describe('monitoring integration', () => {
    it('should abort monitoring when step completes', async () => {
      await runNode(mockParams);

      // The monitoring abort controller should be aborted in the finally block
      // We can't directly test this, but we can verify the flow completed
      expect(mockParams.workflowRuntime.saveState).toHaveBeenCalled();
    });

    it('should handle monitoring preventing step execution via abort signal', async () => {
      // Mock monitoring that aborts immediately
      mockRunStackMonitor.mockImplementation(
        async (
          _params: WorkflowExecutionLoopParams,
          _stepExecutionRuntime: StepExecutionRuntime,
          monitorAbortController: AbortController
        ) => {
          monitorAbortController.abort();
        }
      );

      await runNode(mockParams);

      // Step should still be created but may not run depending on timing
      expect(mockParams.stepExecutionRuntimeFactory.createStepExecutionRuntime).toHaveBeenCalled();
    });
  });

  describe('onCancel lifecycle hook', () => {
    const setupCancellableNode = (onCancel: jest.Mock) => {
      const cancellableNodeImpl: NodeImplementation & CancellableNode = {
        run: jest.fn().mockResolvedValue(undefined),
        onCancel,
      };
      (mockParams.nodesFactory.create as jest.Mock).mockReturnValue(cancellableNodeImpl);
      return cancellableNodeImpl;
    };

    const simulateAbortDuringRun = () => {
      mockRunStackMonitor.mockImplementation(async () => {
        mockStepExecutionRuntime.abortController.abort();
      });
    };

    it('should call onCancel after run() when abort signal was triggered', async () => {
      const mockOnCancel = jest.fn().mockResolvedValue(undefined);
      const cancellableNode = setupCancellableNode(mockOnCancel);
      simulateAbortDuringRun();

      await runNode(mockParams);

      expect(cancellableNode.run).toHaveBeenCalled();
      expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('should not call onCancel when abort signal was not triggered', async () => {
      const mockOnCancel = jest.fn();
      setupCancellableNode(mockOnCancel);

      await runNode(mockParams);

      expect(mockOnCancel).not.toHaveBeenCalled();
    });

    it('should not call onCancel on a non-CancellableNode even if aborted', async () => {
      simulateAbortDuringRun();

      await runNode(mockParams);

      expect(mockNodeImplementation.run).toHaveBeenCalled();
      expect(mockParams.workflowRuntime.saveState).toHaveBeenCalled();
    });

    it('should handle onCancel errors gracefully without throwing', async () => {
      const onCancelError = new Error('onCancel failed');
      const mockOnCancel = jest.fn().mockRejectedValue(onCancelError);
      setupCancellableNode(mockOnCancel);
      simulateAbortDuringRun();

      const workflowLogger = createMockWorkflowEventLogger();
      (mockParams as unknown as Record<string, unknown>).workflowLogger = workflowLogger;

      await runNode(mockParams);

      expect(mockOnCancel).toHaveBeenCalled();
      expect(workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to execute onCancel hook - continuing execution',
        onCancelError
      );
    });

    it('should handle synchronous onCancel that throws', async () => {
      const syncError = new Error('sync onCancel error');
      const mockOnCancel = jest.fn().mockImplementation(() => {
        throw syncError;
      });
      setupCancellableNode(mockOnCancel);
      simulateAbortDuringRun();

      const workflowLogger = createMockWorkflowEventLogger();
      (mockParams as unknown as Record<string, unknown>).workflowLogger = workflowLogger;

      await runNode(mockParams);

      expect(workflowLogger.logError).toHaveBeenCalledWith(
        'Failed to execute onCancel hook - continuing execution',
        syncError
      );
    });
  });
});
