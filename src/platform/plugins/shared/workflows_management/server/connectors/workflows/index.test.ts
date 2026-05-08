/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AlertingConnectorFeatureId, SecurityConnectorFeatureId } from '@kbn/actions-plugin/common';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import {
  ConnectorTypeId,
  executor,
  getConnectorType,
  getWorkflowsConnectorAdapter,
  type GetWorkflowsConnectorTypeArgs,
  resolveAlertStates,
} from '.';
import type { WorkflowsManagementApi } from '../../api/workflows_management_api';

const mockWorkflowsManagementApi = {
  getWorkflow: jest.fn(),
  runWorkflow: jest.fn(),
  scheduleWorkflow: jest.fn(),
} as unknown as WorkflowsManagementApi;

describe('Workflows Connector', () => {
  const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

  describe('getConnectorType', () => {
    it('should return correct connector type configuration', () => {
      const connectorType = getConnectorType(mockWorkflowsManagementApi);

      expect(connectorType.id).toBe('.workflows');
      expect(connectorType.minimumLicenseRequired).toBe('gold');
      expect(connectorType.name).toBe('Workflows');
      expect(connectorType.isSystemActionType).toBe(true);
      expect(connectorType.supportedFeatureIds).toEqual([
        AlertingConnectorFeatureId,
        SecurityConnectorFeatureId,
      ]);
    });

    it('should have correct validation schemas', () => {
      const connectorType = getConnectorType(mockWorkflowsManagementApi);

      expect(connectorType.validate).toBeDefined();
      expect(connectorType.validate.config).toBeDefined();
      expect(connectorType.validate.secrets).toBeDefined();
      expect(connectorType.validate.params).toBeDefined();
    });
  });

  describe('executor', () => {
    const mockRequest = {} as KibanaRequest;

    it('should execute workflow successfully', async () => {
      const mockWorkflowsService = jest.fn().mockResolvedValue('workflow-run-123');
      const deps: GetWorkflowsConnectorTypeArgs = {
        getWorkflowsService: jest.fn().mockResolvedValue(mockWorkflowsService),
      };

      const execOptions = {
        actionId: 'test-action-id',
        services: {} as any,
        config: {},
        secrets: {},
        params: {
          subAction: 'run' as const,
          subActionParams: {
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
          },
        },
        logger: mockLogger,
        configurationUtilities: {} as any,
        connectorUsageCollector: {} as any,
        request: mockRequest,
      };

      const result = await executor(execOptions, deps);

      expect(result).toEqual({
        status: 'ok',
        data: {
          workflowRunId: 'workflow-run-123',
          status: 'executed',
        },
        actionId: 'test-action-id',
      });

      expect(mockWorkflowsService).toHaveBeenCalledWith(
        'test-workflow-id',
        'default',
        {
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
        mockRequest
      );
    });

    it('should skip execution when no alerts are provided', async () => {
      const mockWorkflowsService = jest.fn().mockResolvedValue('workflow-run-123');
      const deps: GetWorkflowsConnectorTypeArgs = {
        getWorkflowsService: jest.fn().mockResolvedValue(mockWorkflowsService),
      };

      const execOptions = {
        actionId: 'test-action-id',
        services: {} as any,
        config: {},
        secrets: {},
        params: {
          subAction: 'run' as const,
          subActionParams: {
            workflowId: 'test-workflow-id',
            spaceId: 'default',
            summaryMode: true,
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
          },
        },
        logger: mockLogger,
        configurationUtilities: {} as any,
        connectorUsageCollector: {} as any,
        request: mockRequest,
      };

      const result = await executor(execOptions, deps);

      expect(result).toEqual({
        status: 'ok',
        data: {
          workflowRunId: 'skipped-no-alerts',
          status: 'skipped',
        },
        actionId: 'test-action-id',
      });

      expect(mockWorkflowsService).not.toHaveBeenCalled();
    });

    it('should throw error for unsupported subAction', async () => {
      const execOptions = {
        actionId: 'test-action-id',
        services: {} as any,
        config: {},
        secrets: {},
        params: {
          subAction: 'invalid-action' as any,
          subActionParams: {
            workflowId: 'test-workflow-id',
            spaceId: 'default',
            summaryMode: true,
          },
        },
        logger: mockLogger,
        configurationUtilities: {} as any,
        connectorUsageCollector: {} as any,
        request: mockRequest,
      };

      await expect(executor(execOptions)).rejects.toThrow(
        '[WorkflowsConnector][Action][ExternalService] Unsupported subAction type invalid-action.'
      );
    });

    it('should handle workflows service errors', async () => {
      const serviceError = new Error('Service unavailable');
      const deps: GetWorkflowsConnectorTypeArgs = {
        getWorkflowsService: jest.fn().mockRejectedValue(serviceError),
      };

      const execOptions = {
        actionId: 'test-action-id',
        services: {} as any,
        config: {},
        secrets: {},
        params: {
          subAction: 'run' as const,
          subActionParams: {
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
          },
        },
        logger: mockLogger,
        configurationUtilities: {} as any,
        connectorUsageCollector: {} as any,
        request: mockRequest,
      };

      await expect(executor(execOptions, deps)).rejects.toThrow(
        'Unable to run workflow test-workflow-id'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to get workflows service: Service unavailable'
      );
    });
  });

  describe('getWorkflowsConnectorAdapter', () => {
    it('should have correct connector type ID', () => {
      const adapter = getWorkflowsConnectorAdapter();
      expect(adapter.connectorTypeId).toBe(ConnectorTypeId);
    });

    it('should build action params correctly', () => {
      const adapter = getWorkflowsConnectorAdapter();

      const mockAlerts = {
        all: { data: [], count: 0 },
        new: { data: [{ _id: 'alert-1', _index: 'test-index-1' }], count: 1 },
        ongoing: { data: [], count: 0 },
        recovered: { data: [], count: 0 },
      };

      const mockRule = {
        id: 'rule-id',
        name: 'test rule',
        tags: ['test-tag'],
        consumer: 'test-consumer',
        producer: 'test-producer',
        ruleTypeId: 'test-rule-type',
      };

      const params = {
        subAction: 'run' as const,
        subActionParams: {
          workflowId: 'test-workflow-id',
        },
      };

      const result = adapter.buildActionParams({
        alerts: mockAlerts as any,
        rule: mockRule,
        params,
        ruleUrl: 'https://example.com/rule',
        spaceId: 'default',
      });

      expect(result.subAction).toBe('run');
      expect(result.subActionParams.workflowId).toBe('test-workflow-id');
      expect(result.subActionParams.inputs).toBeDefined();
      expect(result.subActionParams.inputs?.event?.alerts).toHaveLength(1);
    });

    it('should handle missing workflowId gracefully', () => {
      const adapter = getWorkflowsConnectorAdapter();

      const mockAlerts = {
        all: { data: [], count: 0 },
        new: { data: [], count: 0 },
        ongoing: { data: [], count: 0 },
        recovered: { data: [], count: 0 },
      };

      const mockRule = {
        id: 'rule-id',
        name: 'test rule',
        tags: ['test-tag'],
        consumer: 'test-consumer',
        producer: 'test-producer',
        ruleTypeId: 'test-rule-type',
      };

      const params = {
        subAction: 'run' as const,
        subActionParams: {} as any,
      };

      const result = adapter.buildActionParams({
        alerts: mockAlerts as any,
        rule: mockRule,
        params,
        ruleUrl: 'https://example.com/rule',
        spaceId: 'default',
      });

      expect(result.subActionParams.workflowId).toBe('unknown');
      expect(result.subActionParams.inputs).toBeUndefined();
    });

    it('should default alertStates to new=true, ongoing=false, recovered=false when not provided', () => {
      const adapter = getWorkflowsConnectorAdapter();

      const mockAlerts = {
        all: { data: [{ _id: 'a1', _index: 'idx' }], count: 1 },
        new: { data: [{ _id: 'a1', _index: 'idx' }], count: 1 },
        ongoing: { data: [{ _id: 'a2', _index: 'idx' }], count: 1 },
        recovered: { data: [{ _id: 'a3', _index: 'idx' }], count: 1 },
      };

      const mockRule = {
        id: 'rule-id',
        name: 'test rule',
        tags: ['test-tag'],
        consumer: 'test-consumer',
        producer: 'test-producer',
        ruleTypeId: 'test-rule-type',
      };

      const params = {
        subAction: 'run' as const,
        subActionParams: { workflowId: 'wf-1' },
      };

      const result = adapter.buildActionParams({
        alerts: mockAlerts as any,
        rule: mockRule,
        params,
        spaceId: 'default',
      });

      expect(result.subActionParams.alertStates).toEqual({
        new: true,
        ongoing: false,
        recovered: false,
      });
      expect(result.subActionParams.inputs?.event?.alerts).toHaveLength(1);
      expect(result.subActionParams.inputs?.event?.alerts[0]._id).toBe('a1');
    });

    it('should include ongoing and recovered alerts when alertStates enables them', () => {
      const adapter = getWorkflowsConnectorAdapter();

      const mockAlerts = {
        all: { data: [], count: 3 },
        new: {
          data: [{ _id: 'a1', _index: 'idx' }],
          count: 1,
          alert_count: { active: 1, recovered: 0, ignored: 0 },
        },
        ongoing: {
          data: [{ _id: 'a2', _index: 'idx' }],
          count: 1,
          alert_count: { active: 1, recovered: 0, ignored: 0 },
        },
        recovered: {
          data: [{ _id: 'a3', _index: 'idx' }],
          count: 1,
          alert_count: { active: 0, recovered: 1, ignored: 0 },
        },
      };

      const mockRule = {
        id: 'rule-id',
        name: 'test rule',
        tags: ['test-tag'],
        consumer: 'test-consumer',
        producer: 'test-producer',
        ruleTypeId: 'test-rule-type',
      };

      const params = {
        subAction: 'run' as const,
        subActionParams: {
          workflowId: 'wf-1',
          alertStates: { new: true, ongoing: true, recovered: true },
        },
      };

      const result = adapter.buildActionParams({
        alerts: mockAlerts as any,
        rule: mockRule,
        params,
        spaceId: 'default',
      });

      expect(result.subActionParams.alertStates).toEqual({
        new: true,
        ongoing: true,
        recovered: true,
      });
      expect(result.subActionParams.inputs?.event?.alerts).toHaveLength(3);
    });

    it('should exclude new alerts when alertStates.new is false', () => {
      const adapter = getWorkflowsConnectorAdapter();

      const mockAlerts = {
        all: { data: [], count: 2 },
        new: {
          data: [{ _id: 'a1', _index: 'idx' }],
          count: 1,
          alert_count: { active: 1, recovered: 0, ignored: 0 },
        },
        ongoing: {
          data: [],
          count: 0,
          alert_count: { active: 0, recovered: 0, ignored: 0 },
        },
        recovered: {
          data: [{ _id: 'a2', _index: 'idx' }],
          count: 1,
          alert_count: { active: 0, recovered: 1, ignored: 0 },
        },
      };

      const mockRule = {
        id: 'rule-id',
        name: 'test rule',
        tags: ['test-tag'],
        consumer: 'test-consumer',
        producer: 'test-producer',
        ruleTypeId: 'test-rule-type',
      };

      const params = {
        subAction: 'run' as const,
        subActionParams: {
          workflowId: 'wf-1',
          alertStates: { new: false, ongoing: false, recovered: true },
        },
      };

      const result = adapter.buildActionParams({
        alerts: mockAlerts as any,
        rule: mockRule,
        params,
        spaceId: 'default',
      });

      expect(result.subActionParams.inputs?.event?.alerts).toHaveLength(1);
      expect(result.subActionParams.inputs?.event?.alerts[0]._id).toBe('a2');
    });
  });

  describe('resolveAlertStates', () => {
    it('should return defaults when no alertStates provided', () => {
      expect(resolveAlertStates()).toEqual({ new: true, ongoing: false, recovered: false });
    });

    it('should return defaults when undefined is passed', () => {
      expect(resolveAlertStates(undefined)).toEqual({
        new: true,
        ongoing: false,
        recovered: false,
      });
    });

    it('should respect explicit values', () => {
      expect(resolveAlertStates({ new: false, ongoing: true, recovered: true })).toEqual({
        new: false,
        ongoing: true,
        recovered: true,
      });
    });

    it('should fill in missing fields with defaults', () => {
      expect(resolveAlertStates({ recovered: true })).toEqual({
        new: true,
        ongoing: false,
        recovered: true,
      });
    });
  });
});
