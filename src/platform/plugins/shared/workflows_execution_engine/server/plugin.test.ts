/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import type { TaskManagerStartContract } from '@kbn/task-manager-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import { reEnableScheduledTasksForWorkflow } from './plugin';
import { WorkflowExecutionRepository } from './repositories/workflow_execution_repository';

// Mock the WorkflowExecutionRepository
jest.mock('./repositories/workflow_execution_repository');

describe('reEnableScheduledTasksForWorkflow', () => {
  let mockTaskManager: jest.Mocked<TaskManagerStartContract>;
  let mockLogger: jest.Mocked<Logger>;
  let mockEsClient: jest.Mocked<Client>;
  let mockWorkflowExecutionRepository: jest.Mocked<WorkflowExecutionRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockTaskManager = {
      bulkEnable: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    } as any;

    mockEsClient = {} as any;

    mockWorkflowExecutionRepository = {
      getWorkflowExecutionById: jest.fn(),
    } as any;

    // Mock the WorkflowExecutionRepository constructor
    (
      WorkflowExecutionRepository as jest.MockedClass<typeof WorkflowExecutionRepository>
    ).mockImplementation(() => mockWorkflowExecutionRepository);
  });

  describe('when workflow execution is found', () => {
    beforeEach(() => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
        id: 'execution-123',
        workflowId: 'workflow-test-123',
        status: ExecutionStatus.COMPLETED,
      } as any);
    });

    it('should re-enable the scheduled task successfully', async () => {
      await reEnableScheduledTasksForWorkflow(
        'execution-123',
        'default',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockWorkflowExecutionRepository.getWorkflowExecutionById).toHaveBeenCalledWith(
        'execution-123',
        'default'
      );

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-test-123:scheduled'],
        true
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Re-enabled scheduled task for workflow workflow-test-123 after resume completion'
      );
    });

    it('should handle different workflow IDs correctly', async () => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
        id: 'execution-456',
        workflowId: 'workflow-another-456',
        status: ExecutionStatus.COMPLETED,
      } as any);

      await reEnableScheduledTasksForWorkflow(
        'execution-456',
        'custom-space',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockTaskManager.bulkEnable).toHaveBeenCalledWith(
        ['task:workflow:workflow-another-456:scheduled'],
        true
      );
    });
  });

  describe('when workflow execution is not found', () => {
    beforeEach(() => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue(null);
    });

    it('should log warning and not attempt to re-enable tasks', async () => {
      await reEnableScheduledTasksForWorkflow(
        'execution-123',
        'default',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Workflow execution execution-123 not found, cannot re-enable scheduled tasks'
      );

      expect(mockTaskManager.bulkEnable).not.toHaveBeenCalled();
    });
  });

  describe('when workflow execution repository throws error', () => {
    beforeEach(() => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockRejectedValue(
        new Error('Database connection failed')
      );
    });

    it('should log error and not crash', async () => {
      await reEnableScheduledTasksForWorkflow(
        'execution-123',
        'default',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to re-enable scheduled tasks for workflow execution-123: Error: Database connection failed'
      );

      expect(mockTaskManager.bulkEnable).not.toHaveBeenCalled();
    });
  });

  describe('when task manager bulkEnable fails', () => {
    beforeEach(() => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockResolvedValue({
        id: 'execution-123',
        workflowId: 'workflow-test-123',
        status: ExecutionStatus.COMPLETED,
      } as any);

      mockTaskManager.bulkEnable.mockRejectedValue(new Error('Task manager unavailable'));
    });

    it('should log error and not crash', async () => {
      await reEnableScheduledTasksForWorkflow(
        'execution-123',
        'default',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to re-enable scheduled tasks for workflow execution-123: Error: Task manager unavailable'
      );
    });
  });

  describe('when non-Error is thrown', () => {
    beforeEach(() => {
      mockWorkflowExecutionRepository.getWorkflowExecutionById.mockRejectedValue('String error');
    });

    it('should handle non-Error objects gracefully', async () => {
      await reEnableScheduledTasksForWorkflow(
        'execution-123',
        'default',
        mockTaskManager,
        mockLogger,
        mockEsClient
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to re-enable scheduled tasks for workflow execution-123: String error'
      );
    });
  });
});
