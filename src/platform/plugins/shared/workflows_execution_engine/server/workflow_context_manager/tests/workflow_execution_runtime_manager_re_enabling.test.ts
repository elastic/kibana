/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { WorkflowGraph } from '@kbn/workflows/graph';
import type { IWorkflowEventLogger } from '../../workflow_event_logger/workflow_event_logger';
import { WorkflowExecutionRuntimeManager } from '../workflow_execution_runtime_manager';
import type { WorkflowExecutionState } from '../workflow_execution_state';

// Mock TaskManager
const mockTaskManager = {
  bulkEnable: jest.fn().mockResolvedValue(undefined),
  fetch: jest.fn().mockResolvedValue({
    docs: [],
    versionMap: new Map(),
  }),
} as unknown as TaskManagerStartContract;

// Mock WorkflowEventLogger
const mockWorkflowLogger = {
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
  logDebug: jest.fn(),
} as unknown as IWorkflowEventLogger;

// Mock WorkflowExecutionState
const mockWorkflowExecutionState = {
  getWorkflowExecution: jest.fn(),
  updateWorkflowExecution: jest.fn(),
  flush: jest.fn().mockResolvedValue(undefined),
} as unknown as WorkflowExecutionState;

// Mock WorkflowGraph
const mockWorkflowGraph = {
  topologicalOrder: [],
} as unknown as WorkflowGraph;

describe('WorkflowExecutionRuntimeManager - Task Re-enabling', () => {
  let runtimeManager: WorkflowExecutionRuntimeManager;
  let mockWorkflowExecution: EsWorkflowExecution;

  beforeEach(() => {
    jest.clearAllMocks();

    mockWorkflowExecution = {
      id: 'execution-123',
      workflowId: 'workflow-test-123',
      spaceId: 'default',
      status: ExecutionStatus.RUNNING,
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    } as EsWorkflowExecution;

    (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue(
      mockWorkflowExecution
    );

    runtimeManager = new WorkflowExecutionRuntimeManager({
      workflowExecutionState: mockWorkflowExecutionState,
      workflowExecution: mockWorkflowExecution,
      workflowExecutionGraph: mockWorkflowGraph,
      workflowLogger: mockWorkflowLogger,
      taskManager: mockTaskManager,
    });
  });

  describe('when workflow completes successfully', () => {
    beforeEach(() => {
      // Mock workflow completion
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.COMPLETED,
        finishedAt: new Date().toISOString(),
        duration: 5000,
      });
    });

    it('should re-enable scheduled tasks when workflow completes', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-test-123:scheduled'],
        true
      );

      expect(mockWorkflowLogger.logInfo).toHaveBeenCalledWith(
        'Successfully re-enabled scheduled tasks for workflow workflow-test-123'
      );
    });

    it('should log workflow completion', async () => {
      await runtimeManager.saveState();

      expect(mockWorkflowLogger.logInfo).toHaveBeenCalledWith(
        'Workflow execution completed successfully',
        expect.objectContaining({
          event: {
            action: 'workflow-complete',
            category: ['workflow'],
            outcome: 'success',
          },
        })
      );
    });
  });

  describe('when workflow fails', () => {
    beforeEach(() => {
      // Mock workflow failure
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.FAILED,
        finishedAt: new Date().toISOString(),
        duration: 3000,
        error: 'Test error message',
      });
    });

    it('should re-enable scheduled tasks when workflow fails', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-test-123:scheduled'],
        true
      );

      expect(mockWorkflowLogger.logInfo).toHaveBeenCalledWith(
        'Successfully re-enabled scheduled tasks for workflow workflow-test-123'
      );
    });

    it('should log workflow failure', async () => {
      await runtimeManager.saveState();

      expect(mockWorkflowLogger.logInfo).toHaveBeenCalledWith(
        'Workflow execution failed',
        expect.objectContaining({
          event: {
            action: 'workflow-complete',
            category: ['workflow'],
            outcome: 'failure',
          },
        })
      );
    });
  });

  describe('when workflow is still running', () => {
    beforeEach(() => {
      // Mock workflow still running
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.RUNNING,
      });

      // Set nextNodeId to indicate workflow is still running
      (runtimeManager as any).nextNodeId = 'next-step-id';
    });

    it('should not re-enable scheduled tasks when workflow is still running', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).not.toHaveBeenCalled();
    });
  });

  describe('when workflow is in waiting state', () => {
    beforeEach(() => {
      // Mock workflow in waiting state
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.WAITING,
      });

      // Set nextNodeId to indicate workflow is still running
      (runtimeManager as any).nextNodeId = 'next-step-id';
    });

    it('should not re-enable scheduled tasks when workflow is waiting', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).not.toHaveBeenCalled();
    });
  });

  describe('when TaskManager is not available', () => {
    beforeEach(() => {
      // Create runtime manager without TaskManager
      runtimeManager = new WorkflowExecutionRuntimeManager({
        workflowExecutionState: mockWorkflowExecutionState,
        workflowExecution: mockWorkflowExecution,
        workflowExecutionGraph: mockWorkflowGraph,
        workflowLogger: mockWorkflowLogger,
        // No taskManager provided
      });

      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.COMPLETED,
        finishedAt: new Date().toISOString(),
        duration: 5000,
      });
    });

    it('should skip re-enabling when TaskManager is not available', async () => {
      await runtimeManager.saveState();

      expect(mockWorkflowLogger.logDebug).toHaveBeenCalledWith(
        'TaskManager not available, skipping scheduled task re-enabling'
      );
    });
  });

  describe('when TaskManager bulkEnable fails', () => {
    beforeEach(() => {
      (mockTaskManager.bulkEnable as jest.Mock).mockRejectedValue(
        new Error('TaskManager unavailable')
      );

      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        status: ExecutionStatus.COMPLETED,
        finishedAt: new Date().toISOString(),
        duration: 5000,
      });
    });

    it('should log error when TaskManager bulkEnable fails', async () => {
      await runtimeManager.saveState();

      expect(mockWorkflowLogger.logError).toHaveBeenCalledWith(
        'Failed to re-enable scheduled tasks for workflow workflow-test-123',
        expect.any(Error)
      );
    });
  });

  describe('when workflow execution has different workflowId', () => {
    beforeEach(() => {
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        workflowId: 'workflow-different-456',
        status: ExecutionStatus.COMPLETED,
        finishedAt: new Date().toISOString(),
        duration: 5000,
      });
    });

    it('should re-enable scheduled tasks with correct workflowId', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-different-456:scheduled'],
        true
      );
    });
  });

  describe('when workflow execution has different spaceId', () => {
    beforeEach(() => {
      (mockWorkflowExecutionState.getWorkflowExecution as jest.Mock).mockReturnValue({
        ...mockWorkflowExecution,
        spaceId: 'custom-space',
        status: ExecutionStatus.COMPLETED,
        finishedAt: new Date().toISOString(),
        duration: 5000,
      });
    });

    it('should re-enable scheduled tasks with correct spaceId', async () => {
      await runtimeManager.saveState();

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-test-123:scheduled'],
        true
      );
    });
  });
});
