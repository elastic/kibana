/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { createExternalService, type WorkflowsServiceFunction } from './service';

describe('Workflows Service', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockRequest: KibanaRequest;

  beforeEach(() => {
    jest.resetAllMocks();
    mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
    mockRequest = {} as KibanaRequest;
  });

  describe('createExternalService', () => {
    const actionId = 'test-action-id';

    const mockConfigurationUtilities = actionsConfigMock.create();
    const mockConnectorUsageCollector = {} as any;

    it('should create external service with all dependencies', () => {
      const mockWorkflowService: WorkflowsServiceFunction = jest.fn();

      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest,
        mockWorkflowService
      );

      expect(service).toBeDefined();
      expect(service.runWorkflow).toBeInstanceOf(Function);
    });

    it('should create external service without workflow service', () => {
      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest
      );

      expect(service).toBeDefined();
      expect(service.runWorkflow).toBeInstanceOf(Function);
    });
  });

  describe('runWorkflow', () => {
    const actionId = 'test-action-id';
    const mockConfigurationUtilities = actionsConfigMock.create();
    const mockConnectorUsageCollector = {} as any;

    it('should successfully run workflow', async () => {
      const mockWorkflowService: WorkflowsServiceFunction = jest
        .fn()
        .mockResolvedValue('workflow-run-123');

      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest,
        mockWorkflowService
      );

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: { test: 'data' },
      };

      const result = await service.runWorkflow(params);

      expect(result).toEqual({
        workflowRunId: 'workflow-run-123',
        status: 'executed',
      });

      expect(mockWorkflowService).toHaveBeenCalledWith(
        'test-workflow-id',
        'default',
        { test: 'data' },
        mockRequest
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting to run workflow test-workflow-id via internal service'
      );
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Successfully started workflow test-workflow-id, run ID: workflow-run-123'
      );
    });

    it('should handle missing workflow service', async () => {
      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest
      );

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: { test: 'data' },
      };

      await expect(service.runWorkflow(params)).rejects.toThrow(
        'Workflows service not available. This connector requires workflows management plugin to be enabled.'
      );

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Attempting to run workflow test-workflow-id via internal service'
      );
    });

    it('should handle workflow service errors', async () => {
      const mockWorkflowService: WorkflowsServiceFunction = jest
        .fn()
        .mockRejectedValue(new Error('Workflow execution failed'));

      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest,
        mockWorkflowService
      );

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: { test: 'data' },
      };

      await expect(service.runWorkflow(params)).rejects.toThrow(
        'Unable to run workflow test-workflow-id. Error: Workflow execution failed'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Error running workflow test-workflow-id: Workflow execution failed'
      );
    });

    it('should handle empty workflow run response', async () => {
      const mockWorkflowService: WorkflowsServiceFunction = jest.fn().mockResolvedValue('');

      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest,
        mockWorkflowService
      );

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: { test: 'data' },
      };

      await expect(service.runWorkflow(params)).rejects.toThrow(
        'Invalid response: missing workflowRunId'
      );
    });

    it('should handle missing inputs parameter', async () => {
      const mockWorkflowService: WorkflowsServiceFunction = jest
        .fn()
        .mockResolvedValue('workflow-run-123');

      const service = createExternalService(
        actionId,
        mockLogger,
        mockConfigurationUtilities,
        mockConnectorUsageCollector,
        mockRequest,
        mockWorkflowService
      );

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
      };

      const result = await service.runWorkflow(params);

      expect(result).toEqual({
        workflowRunId: 'workflow-run-123',
        status: 'executed',
      });

      expect(mockWorkflowService).toHaveBeenCalledWith(
        'test-workflow-id',
        'default',
        {},
        mockRequest
      );
    });
  });
});
