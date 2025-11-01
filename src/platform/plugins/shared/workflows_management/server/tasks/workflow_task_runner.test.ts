/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IUnsecuredActionsClient } from '@kbn/actions-plugin/server';
import type { Logger } from '@kbn/core/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { WorkflowsExecutionEnginePluginStart } from '@kbn/workflows-execution-engine/server';
import { createWorkflowTaskRunner } from './workflow_task_runner';
import type { WorkflowsService } from '../workflows_management/workflows_management_service';

// Mock dependencies
const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
} as unknown as Logger;

const mockWorkflowsService = {
  getWorkflowExecutions: jest.fn(),
  getWorkflowExecution: jest.fn(),
  getWorkflow: jest.fn().mockResolvedValue({
    id: 'workflow-test-123',
    name: 'Test Workflow',
    enabled: true,
    definition: {
      name: 'Test Workflow',
      enabled: true,
      version: '1',
      triggers: [{ type: 'scheduled', enabled: true, with: { interval: '5s' } }],
      steps: [],
    },
    valid: true,
  }),
} as unknown as WorkflowsService;

const mockWorkflowsExecutionEngine = {
  executeWorkflow: jest.fn(),
} as unknown as WorkflowsExecutionEnginePluginStart;

const mockActionsClient = {} as unknown as IUnsecuredActionsClient;

describe('WorkflowTaskRunner - Task Re-enabling Behavior', () => {
  let createTaskRunner: ReturnType<typeof createWorkflowTaskRunner>;
  let mockTaskInstance: any;

  beforeEach(() => {
    jest.clearAllMocks();

    createTaskRunner = createWorkflowTaskRunner({
      logger: mockLogger,
      workflowsService: mockWorkflowsService,
      workflowsExecutionEngine: mockWorkflowsExecutionEngine,
      actionsClient: mockActionsClient,
    });

    mockTaskInstance = {
      id: 'workflow:workflow-test-123:scheduled',
      params: {
        workflowId: 'workflow-test-123',
        spaceId: 'default',
        triggerType: 'scheduled',
      },
      state: {
        lastRunAt: null,
        lastRunStatus: null,
        lastRunError: null,
      },
    };
  });

  describe('when workflow execution enters WAITING state', () => {
    beforeEach(() => {
      // Mock no existing in-progress executions
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [],
        total: 0,
      });

      // Mock workflow execution that enters WAITING state
      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      // Mock workflow execution status as WAITING
      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockResolvedValue({
        id: 'execution-123',
        status: ExecutionStatus.WAITING,
        workflowId: 'workflow-test-123',
      });
    });

    it('should disable the scheduled task when workflow enters WAITING state', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: true,
        },
        shouldDisableTask: true,
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Workflow workflow-test-123 is in waiting state - disabling scheduled task to prevent rescheduling'
      );
    });

    it('should log the workflow execution completion', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      await taskRunner.run();

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully executed interval/cron-scheduled workflow workflow-test-123, execution ID: execution-123'
      );
    });
  });

  describe('when workflow execution enters WAITING_FOR_INPUT state', () => {
    beforeEach(() => {
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [],
        total: 0,
      });

      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockResolvedValue({
        id: 'execution-123',
        status: ExecutionStatus.WAITING_FOR_INPUT,
        workflowId: 'workflow-test-123',
      });
    });

    it('should disable the scheduled task when workflow enters WAITING_FOR_INPUT state', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: true,
        },
        shouldDisableTask: true,
      });
    });
  });

  describe('when workflow execution completes normally', () => {
    beforeEach(() => {
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [],
        total: 0,
      });

      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockResolvedValue({
        id: 'execution-123',
        status: ExecutionStatus.COMPLETED,
        workflowId: 'workflow-test-123',
      });
    });

    it('should not disable the scheduled task when workflow completes normally', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: false,
        },
      });

      expect(result.shouldDisableTask).toBeUndefined();
    });
  });

  describe('when workflow execution fails', () => {
    beforeEach(() => {
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [],
        total: 0,
      });

      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockResolvedValue({
        id: 'execution-123',
        status: ExecutionStatus.FAILED,
        workflowId: 'workflow-test-123',
      });
    });

    it('should not disable the scheduled task when workflow fails', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: false,
        },
      });

      expect(result.shouldDisableTask).toBeUndefined();
    });
  });

  describe('when there are existing in-progress executions', () => {
    beforeEach(() => {
      // Mock existing in-progress execution
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [
          {
            id: 'existing-execution-123',
            status: ExecutionStatus.RUNNING,
            workflowId: 'workflow-test-123',
          },
        ],
        total: 1,
      });
    });

    it('should skip execution when workflow is already in progress', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Skipping scheduled execution for workflow workflow-test-123 - workflow is already in progress (status: running)'
      );

      // Should not execute the workflow
      expect(mockWorkflowsExecutionEngine.executeWorkflow).not.toHaveBeenCalled();
    });
  });

  describe('when fetching workflow execution status fails', () => {
    beforeEach(() => {
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockResolvedValue({
        results: [],
        total: 0,
      });

      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      // Mock failure to fetch workflow execution status
      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockRejectedValue(
        new Error('Failed to fetch workflow execution')
      );
    });

    it('should not disable the scheduled task when status fetch fails', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: false,
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to fetch workflow execution status for execution-123: Error: Failed to fetch workflow execution'
      );
    });
  });

  describe('when checking existing executions fails', () => {
    beforeEach(() => {
      // Mock failure to check existing executions
      (mockWorkflowsService.getWorkflowExecutions as jest.Mock).mockRejectedValue(
        new Error('Failed to check existing executions')
      );

      (mockWorkflowsExecutionEngine.executeWorkflow as jest.Mock).mockResolvedValue({
        workflowExecutionId: 'execution-123',
      });

      (mockWorkflowsService.getWorkflowExecution as jest.Mock).mockResolvedValue({
        id: 'execution-123',
        status: ExecutionStatus.COMPLETED,
        workflowId: 'workflow-test-123',
      });
    });

    it('should continue execution when existing executions check fails', async () => {
      const taskRunner = createTaskRunner({ taskInstance: mockTaskInstance });
      const result = await taskRunner.run();

      expect(result).toEqual({
        state: {
          lastRunAt: expect.any(String),
          lastRunStatus: 'success',
          lastRunError: undefined,
          isWaiting: false,
        },
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to check existing executions for workflow workflow-test-123: Error: Failed to check existing executions'
      );

      // Should still execute the workflow
      expect(mockWorkflowsExecutionEngine.executeWorkflow).toHaveBeenCalled();
    });
  });
});
