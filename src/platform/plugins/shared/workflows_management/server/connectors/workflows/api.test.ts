/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { api } from './api';
import type { ExternalService } from './types';

describe('Workflows API', () => {
  let mockLogger: jest.Mocked<Logger>;
  let mockExternalService: jest.Mocked<ExternalService>;

  beforeEach(() => {
    jest.resetAllMocks();
    mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
    mockExternalService = {
      runWorkflow: jest.fn(),
    };
  });

  describe('run', () => {
    it('should execute workflow when alerts are provided', async () => {
      mockExternalService.runWorkflow.mockResolvedValue({
        workflowRunId: 'workflow-run-123',
        status: 'executed',
      });

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      };

      const result = await api.run({
        externalService: mockExternalService,
        params,
        logger: mockLogger,
      });

      expect(result).toEqual({
        workflowRunId: 'workflow-run-123',
        status: 'executed',
      });

      expect(mockExternalService.runWorkflow).toHaveBeenCalledWith({
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      });
    });

    it('should skip execution when no alerts are provided', async () => {
      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [],
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      };

      const result = await api.run({
        externalService: mockExternalService,
        params,
        logger: mockLogger,
      });

      expect(result).toEqual({
        workflowRunId: 'skipped-no-alerts',
        status: 'skipped',
      });

      expect(mockExternalService.runWorkflow).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] No alerts. Skipping workflow execution for workflowId: test-workflow-id'
      );
    });

    it('should skip execution when alerts is null', async () => {
      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: null as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      };

      const result = await api.run({
        externalService: mockExternalService,
        params,
        logger: mockLogger,
      });

      expect(result).toEqual({
        workflowRunId: 'skipped-no-alerts',
        status: 'skipped',
      });

      expect(mockExternalService.runWorkflow).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] No alerts. Skipping workflow execution for workflowId: test-workflow-id'
      );
    });

    it('should skip execution when alerts is undefined', async () => {
      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: undefined as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            spaceId: 'default',
          },
        },
      };

      const result = await api.run({
        externalService: mockExternalService,
        params,
        logger: mockLogger,
      });

      expect(result).toEqual({
        workflowRunId: 'skipped-no-alerts',
        status: 'skipped',
      });

      expect(mockExternalService.runWorkflow).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] No alerts. Skipping workflow execution for workflowId: test-workflow-id'
      );
    });

    it('should handle external service errors', async () => {
      mockExternalService.runWorkflow.mockRejectedValue(new Error('Workflow execution failed'));

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      };

      await expect(
        api.run({
          externalService: mockExternalService,
          params,
          logger: mockLogger,
        })
      ).rejects.toThrow('Workflow execution failed');

      expect(mockExternalService.runWorkflow).toHaveBeenCalledWith({
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: 'https://example.com/rule',
            spaceId: 'default',
          },
        },
      });
    });

    it('should execute workflow without inputs', async () => {
      mockExternalService.runWorkflow.mockResolvedValue({
        workflowRunId: 'workflow-run-456',
        status: 'executed',
      });

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: undefined,
            spaceId: 'default',
          },
        },
      };

      const result = await api.run({
        externalService: mockExternalService,
        params,
        logger: mockLogger,
      });

      expect(result).toEqual({
        workflowRunId: 'workflow-run-456',
        status: 'executed',
      });

      expect(mockExternalService.runWorkflow).toHaveBeenCalledWith({
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }] as any,
            rule: {
              id: 'rule-1',
              name: 'Test Rule',
              tags: ['test'],
              consumer: 'test-consumer',
              producer: 'test-producer',
              ruleTypeId: 'test-rule-type',
            },
            ruleUrl: undefined,
            spaceId: 'default',
          },
        },
      });
    });
  });
});
