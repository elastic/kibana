/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { actionsClientMock } from '@kbn/actions-plugin/server/actions_client/actions_client.mock';
import { alertDeletionClientMock } from '@kbn/alerting-plugin/server/alert_deletion/alert_deletion_client.mock';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { rulesSettingsClientMock } from '@kbn/alerting-plugin/server/rules_settings/rules_settings_client.mock';
import type { IScopedClusterClient } from '@kbn/core/server';
import { coreMock } from '@kbn/core/server/mocks';
import { mockRouter as createMockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import type { WorkflowsRequestHandlerContext } from '../../types';
import type { WorkflowsManagementApi } from '../workflows_management_api';

export const mockLogger = loggingSystemMock.create().get();

export const createMockRouterInstance = () => createMockRouter.create();

interface MockSpaces {
  getSpaceId: (req: unknown) => Promise<string>;
}

export const createSpacesMock = (id = 'default'): jest.Mocked<MockSpaces> => ({
  getSpaceId: jest.fn().mockReturnValue(id),
});

export const createMockWorkflowsApi = (): WorkflowsManagementApi => {
  // Create a mock object that automatically creates jest.fn() for any property access
  return new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string) => {
        if (!target[prop]) {
          target[prop] = jest.fn();
        }
        return target[prop];
      },
    }
  ) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

export const createMockResponse = () => ({
  ok: jest.fn().mockReturnThis(),
  notFound: jest.fn().mockReturnThis(),
  badRequest: jest.fn().mockReturnThis(),
  conflict: jest.fn().mockReturnThis(),
  customError: jest.fn().mockReturnThis(),
});

export const createMockWorkflow = (overrides = {}) => ({
  id: 'workflow-1',
  name: 'Test Workflow',
  description: 'A test workflow',
  enabled: true,
  steps: [],
  ...overrides,
});

export const createMockWorkflowExecution = (overrides = {}) => ({
  id: 'execution-1',
  workflowId: 'workflow-1',
  status: 'running',
  startedAt: '2023-01-01T00:00:00Z',
  ...overrides,
});

export const createMockStepExecution = (overrides = {}) => ({
  id: 'step-1',
  executionId: 'execution-1',
  stepId: 'step-1',
  status: 'pending',
  ...overrides,
});

/**
 * Creates a mock rule type for testing alert preprocessing
 */
const createMockRuleType = (ruleTypeId: string) => ({
  id: ruleTypeId,
  name: 'Test Rule Type',
  alerts: {
    formatAlert: jest.fn((source: Record<string, unknown>) => {
      // Add signal property if signal-mappable fields are present
      const hasSignalFields =
        source['kibana.alert.depth'] ||
        source['kibana.alert.original_time'] ||
        source['kibana.alert.reason'];
      return hasSignalFields ? { ...source, signal: {} } : source;
    }),
  },
});

/**
 * Creates a mock request handler context with core and alerting contexts
 * @param overrides - Optional overrides for the core context (e.g., custom elasticsearch client)
 * @param ruleTypes - Optional array of rule type IDs to include in the alerting context
 */
export const createMockRequestHandlerContext = (
  overrides?: {
    elasticsearchClient?: {
      mget?: jest.Mock;
    };
  },
  ruleTypes: string[] = ['test-rule-type']
): WorkflowsRequestHandlerContext => {
  const mockCoreContext = coreMock.createRequestHandlerContext();

  // Apply overrides if provided
  if (overrides?.elasticsearchClient?.mget) {
    // Directly assign the mock function - asCurrentUser from coreMock allows property assignment
    (
      mockCoreContext.elasticsearch.client.asCurrentUser as jest.Mocked<
        IScopedClusterClient['asCurrentUser']
      >
    ).mget = overrides.elasticsearchClient.mget;
  }

  // Create mock rule type registry map
  const mockRuleTypeRegistryMap = new Map();
  ruleTypes.forEach((ruleTypeId) => {
    mockRuleTypeRegistryMap.set(ruleTypeId, createMockRuleType(ruleTypeId));
  });

  return coreMock.createCustomRequestHandlerContext({
    core: mockCoreContext,
    actions: {
      getActionsClient: jest.fn(() => actionsClientMock.create()),
      listTypes: jest.fn(() => []),
    },
    alerting: {
      listTypes: jest.fn(() => mockRuleTypeRegistryMap),
      getRulesClient: jest.fn(() => Promise.resolve(rulesClientMock.create())),
      getRulesSettingsClient: jest.fn(() => rulesSettingsClientMock.create()),
      getFrameworkHealth: jest.fn(() => Promise.resolve({ isHealthy: true, message: 'OK' })),
      areApiKeysEnabled: jest.fn(() => Promise.resolve(true)),
      getAlertDeletionClient: jest.fn(() => alertDeletionClientMock.create()),
    },
    licensing: licensingMock.createRequestHandlerContext(),
  }) as unknown as WorkflowsRequestHandlerContext;
};
