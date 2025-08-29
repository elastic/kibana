/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient, SavedObjectsClientContract } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { WorkflowStatus } from '@kbn/workflows';
import { WORKFLOW_SAVED_OBJECT_TYPE } from '../saved_objects/workflow';
import type { WorkflowTaskScheduler } from '../tasks/workflow_task_scheduler';
import { WorkflowsService } from './workflows_management_service';

describe('WorkflowsService', () => {
  let service: WorkflowsService;
  let mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  let mockEsClient: jest.Mocked<ElasticsearchClient>;
  let mockTaskScheduler: jest.Mocked<WorkflowTaskScheduler>;
  let mockLogger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    mockSavedObjectsClient = {
      find: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockEsClient = {
      indices: {
        exists: jest.fn().mockResolvedValue({ body: false }),
        create: jest.fn().mockResolvedValue({ body: {} }),
        putMapping: jest.fn().mockResolvedValue({ body: {} }),
      },
    } as any;
    mockTaskScheduler = {
      unscheduleWorkflowTasks: jest.fn(),
    } as any;
    mockLogger = loggerMock.create();

    const mockEsClientPromise = Promise.resolve(mockEsClient);
    const mockGetSavedObjectsClient = jest.fn().mockResolvedValue(mockSavedObjectsClient);

    service = new WorkflowsService(
      mockEsClientPromise,
      mockLogger,
      mockGetSavedObjectsClient,
      'test-workflows-execution-index',
      'test-steps-execution-index',
      'test-workflow-execution-logs-index',
      false
    );
    (service as any).taskScheduler = mockTaskScheduler;
  });

  describe('deleteWorkflows', () => {
    it('should soft delete workflows by setting deleted_at timestamp', async () => {
      const workflowIds = ['workflow-1', 'workflow-2'];
      const mockRequest = {} as any;

      await service.deleteWorkflows(workflowIds, mockRequest);

      expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('workflow-1');
      expect(mockTaskScheduler.unscheduleWorkflowTasks).toHaveBeenCalledWith('workflow-2');

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        WORKFLOW_SAVED_OBJECT_TYPE,
        'workflow-1',
        expect.objectContaining({
          deleted_at: expect.any(Date),
          lastUpdatedBy: 'system',
        })
      );

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        WORKFLOW_SAVED_OBJECT_TYPE,
        'workflow-2',
        expect.objectContaining({
          deleted_at: expect.any(Date),
          lastUpdatedBy: 'system',
        })
      );

      expect(mockSavedObjectsClient.delete).not.toHaveBeenCalled();
    });
  });

  describe('searchWorkflows', () => {
    it('should exclude deleted workflows by default', async () => {
      const mockResponse = {
        saved_objects: [
          {
            id: 'workflow-1',
            type: WORKFLOW_SAVED_OBJECT_TYPE,
            references: [],
            score: 1,
            attributes: {
              name: 'Test Workflow',
              description: 'A test workflow',
              status: WorkflowStatus.ACTIVE,
              tags: [],
              yaml: '',
              definition: {},
              createdBy: 'system',
              lastUpdatedBy: 'system',
              deleted: false,
            },
            created_at: '2023-01-01T00:00:00Z',
            updated_at: '2023-01-01T00:00:00Z',
          },
        ],
        total: 1,
        per_page: 100,
        page: 1,
      };

      mockSavedObjectsClient.find.mockResolvedValue(mockResponse);

      // Mock the searchWorkflowExecutions method
      jest.spyOn(service, 'searchWorkflowExecutions').mockResolvedValue({
        results: [],
        _pagination: { offset: 0, limit: 100, total: 0 },
      });

      await service.searchWorkflows({ limit: 100, offset: 0 });

      expect(mockSavedObjectsClient.find).toHaveBeenCalledWith({
        type: WORKFLOW_SAVED_OBJECT_TYPE,
        perPage: 100,
        sortField: 'updated_at',
        sortOrder: 'desc',
        filter: `not ${WORKFLOW_SAVED_OBJECT_TYPE}.attributes.deleted_at: *`,
      });
    });
  });

  describe('createWorkflow', () => {
    it('should initialize deleted_at to null for new workflows', async () => {
      const mockWorkflow = {
        yaml: `
name: Test Workflow
description: A test workflow
status: active
definition:
  triggers: []
  steps: []
        `,
      };

      const mockResponse = {
        id: 'workflow-1',
        type: WORKFLOW_SAVED_OBJECT_TYPE,
        references: [],
        attributes: {},
        updated_at: '2023-01-01T00:00:00Z',
      };

      const mockRequest = {} as any;

      mockSavedObjectsClient.create.mockResolvedValue(mockResponse);

      try {
        await service.createWorkflow(mockWorkflow, mockRequest);
      } catch (error) {
        // Ignore errors from yaml parsing - we just want to verify the saved object structure
      }

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        WORKFLOW_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          deleted_at: null,
        })
      );
    });
  });
});
