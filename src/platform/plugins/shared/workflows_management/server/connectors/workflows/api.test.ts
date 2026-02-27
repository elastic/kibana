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
      scheduleWorkflow: jest.fn(),
    };
  });

  describe('run', () => {
    it('should execute workflow when alerts are provided (summary mode)', async () => {
      mockExternalService.runWorkflow.mockResolvedValue({
        workflowRunId: 'workflow-run-123',
        status: 'executed',
      });

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        summaryMode: true,
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
      expect(mockExternalService.scheduleWorkflow).not.toHaveBeenCalled();
    });

    it('should execute workflow in summary mode by default (summary undefined)', async () => {
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

      expect(mockExternalService.runWorkflow).toHaveBeenCalled();
      expect(mockExternalService.scheduleWorkflow).not.toHaveBeenCalled();
    });

    it('should schedule workflow for each alert in per-alert mode', async () => {
      mockExternalService.scheduleWorkflow
        .mockResolvedValueOnce('workflow-run-1')
        .mockResolvedValueOnce('workflow-run-2');

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        summaryMode: false,
        inputs: {
          event: {
            alerts: [
              { _id: 'alert-1', _index: 'test-index' },
              { _id: 'alert-2', _index: 'test-index' },
            ] as any,
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
        workflowRunId: 'per-alert-scheduling-2-success',
        status: 'scheduled',
      });

      expect(mockExternalService.scheduleWorkflow).toHaveBeenCalledTimes(2);
      expect(mockExternalService.scheduleWorkflow).toHaveBeenNthCalledWith(1, {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-1', _index: 'test-index' }],
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
      expect(mockExternalService.scheduleWorkflow).toHaveBeenNthCalledWith(2, {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        inputs: {
          event: {
            alerts: [{ _id: 'alert-2', _index: 'test-index' }],
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
      expect(mockExternalService.runWorkflow).not.toHaveBeenCalled();
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] Scheduled workflow for alert 1/2, workflowRunId: workflow-run-1'
      );
      expect(mockLogger.debug).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] Scheduled workflow for alert 2/2, workflowRunId: workflow-run-2'
      );
    });

    it('should handle errors in per-alert mode and continue with remaining alerts', async () => {
      mockExternalService.scheduleWorkflow
        .mockResolvedValueOnce('workflow-run-1')
        .mockRejectedValueOnce(new Error('Scheduling failed'))
        .mockResolvedValueOnce('workflow-run-3');

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        summaryMode: false,
        inputs: {
          event: {
            alerts: [
              { _id: 'alert-1', _index: 'test-index' },
              { _id: 'alert-2', _index: 'test-index' },
              { _id: 'alert-3', _index: 'test-index' },
            ] as any,
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
        workflowRunId: 'per-alert-scheduling-2-success-1-errors',
        status: 'partial',
      });

      expect(mockExternalService.scheduleWorkflow).toHaveBeenCalledTimes(3);
      expect(mockLogger.error).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] Failed to schedule workflow for alert 2/3: Scheduling failed'
      );
      expect(mockLogger.warn).toHaveBeenCalledWith(
        '[WorkflowsConnector][run] Completed per-alert scheduling with 1 error(s) out of 3 alert(s)'
      );
    });

    it('should return failed status when all alerts fail in per-alert mode', async () => {
      mockExternalService.scheduleWorkflow.mockRejectedValue(new Error('Scheduling failed'));

      const params = {
        workflowId: 'test-workflow-id',
        spaceId: 'default',
        summaryMode: false,
        inputs: {
          event: {
            alerts: [
              { _id: 'alert-1', _index: 'test-index' },
              { _id: 'alert-2', _index: 'test-index' },
            ] as any,
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
        workflowRunId: 'per-alert-scheduling-0-success-2-errors',
        status: 'failed',
      });

      expect(mockExternalService.scheduleWorkflow).toHaveBeenCalledTimes(2);
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
