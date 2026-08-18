/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { KibanaRequest } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { EXAMPLE_MANAGED_WORKFLOW_ID } from '@kbn/workflows/managed';
import {
  createManagedWorkflowsSystemApiProvider,
  createWorkflowsClientProvider,
} from './workflows_client';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';

const createMockWorkflowsService = (
  overrides: {
    hasAtLeast?: boolean;
    emitEvent?: jest.Mock;
    getManagedWorkflowStatus?: jest.Mock;
  } = {}
) => {
  const emitEvent = overrides.emitEvent ?? jest.fn().mockResolvedValue(undefined);
  const getManagedWorkflowStatus =
    overrides.getManagedWorkflowStatus ??
    jest.fn().mockResolvedValue({
      status: 'intact',
      workflowId: EXAMPLE_MANAGED_WORKFLOW_ID,
      definitionId: EXAMPLE_MANAGED_WORKFLOW_ID,
      spaceId: 'default',
      installed: true,
      enabled: true,
      valid: true,
      managedBy: 'testPlugin',
      storedVersion: 1,
      registryVersion: 1,
      storedHash: 'hash',
      registryHash: 'hash',
    });
  return {
    getPluginsStart: jest.fn().mockResolvedValue({
      licensing: {
        getLicense: jest.fn().mockResolvedValue({
          hasAtLeast: jest.fn().mockReturnValue(overrides.hasAtLeast ?? true),
        }),
      },
      workflowsExecutionEngine: {
        triggerEvents: { emitEvent },
      },
    }),
    getManagedWorkflowStatus,
  } as unknown as WorkflowsService;
};

describe('createWorkflowsClientProvider', () => {
  const logger = loggingSystemMock.createLogger();
  const mockRequest = {} as KibanaRequest;

  beforeEach(() => jest.clearAllMocks());

  it('should return isWorkflowsAvailable true when license is sufficient and config.available is true', async () => {
    const service = createMockWorkflowsService({ hasAtLeast: true });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);

    expect(client.isWorkflowsAvailable).toBe(true);
  });

  it('should return isWorkflowsAvailable false when license is insufficient', async () => {
    const service = createMockWorkflowsService({ hasAtLeast: false });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);

    expect(client.isWorkflowsAvailable).toBe(false);
  });

  it('should return isWorkflowsAvailable false when config.available is false', async () => {
    const service = createMockWorkflowsService({ hasAtLeast: true });
    const config = { available: false } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);

    expect(client.isWorkflowsAvailable).toBe(false);
  });

  it('should delegate emitEvent to the execution engine when available', async () => {
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const service = createMockWorkflowsService({ emitEvent });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);
    await client.emitEvent('cases.updated', { caseId: '123' });

    expect(emitEvent).toHaveBeenCalledWith({
      triggerId: 'cases.updated',
      payload: { caseId: '123' },
      request: mockRequest,
    });
  });

  it('should silently drop emitEvent when workflows are unavailable', async () => {
    const emitEvent = jest.fn();
    const service = createMockWorkflowsService({ hasAtLeast: false, emitEvent });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);
    await client.emitEvent('cases.updated', { caseId: '123' });

    expect(emitEvent).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(
      'Workflows is not available in this environment. Trigger event ignored.'
    );
  });

  it('should delegate request-scoped managed workflow status checks when available', async () => {
    const getManagedWorkflowStatus = jest.fn().mockResolvedValue({ status: 'intact' });
    const service = createMockWorkflowsService({ getManagedWorkflowStatus });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);
    await client.managedWorkflows.getWorkflowStatus('testPlugin', EXAMPLE_MANAGED_WORKFLOW_ID, {
      spaceId: 'default',
    });

    expect(getManagedWorkflowStatus).toHaveBeenCalledWith(
      EXAMPLE_MANAGED_WORKFLOW_ID,
      { spaceId: 'default' },
      'testPlugin'
    );
  });

  it('should reject request-scoped managed workflow status checks when unavailable', async () => {
    const getManagedWorkflowStatus = jest.fn();
    const service = createMockWorkflowsService({ hasAtLeast: false, getManagedWorkflowStatus });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createWorkflowsClientProvider(service, config, logger);

    const client = await provider(mockRequest);

    await expect(
      client.managedWorkflows.getWorkflowStatus('testPlugin', EXAMPLE_MANAGED_WORKFLOW_ID, {
        spaceId: 'default',
      })
    ).rejects.toThrow('Workflows is not available in this environment');
    expect(getManagedWorkflowStatus).not.toHaveBeenCalled();
  });
});

describe('createManagedWorkflowsSystemApiProvider', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => jest.clearAllMocks());

  it('should delegate requestless managed workflow status checks when available', async () => {
    const getManagedWorkflowStatus = jest.fn().mockResolvedValue({ status: 'intact' });
    const service = createMockWorkflowsService({ getManagedWorkflowStatus });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createManagedWorkflowsSystemApiProvider(service, config, logger);

    const client = await provider('testPlugin');
    await client.getWorkflowStatus(EXAMPLE_MANAGED_WORKFLOW_ID, { spaceId: 'default' });

    expect(getManagedWorkflowStatus).toHaveBeenCalledWith(
      EXAMPLE_MANAGED_WORKFLOW_ID,
      { spaceId: 'default' },
      'testPlugin'
    );
  });

  it('should reject requestless managed workflow status checks when unavailable', async () => {
    const getManagedWorkflowStatus = jest.fn();
    const service = createMockWorkflowsService({ hasAtLeast: false, getManagedWorkflowStatus });
    const config = { available: true } as WorkflowsManagementConfig;
    const provider = createManagedWorkflowsSystemApiProvider(service, config, logger);

    const client = await provider('testPlugin');

    await expect(
      client.getWorkflowStatus(EXAMPLE_MANAGED_WORKFLOW_ID, { spaceId: 'default' })
    ).rejects.toThrow('Workflows is not available in this environment');
    expect(getManagedWorkflowStatus).not.toHaveBeenCalled();
  });
});
