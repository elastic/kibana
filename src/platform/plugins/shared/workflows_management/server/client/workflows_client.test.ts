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
import { createWorkflowsClientProvider } from './workflows_client';
import type { WorkflowsService } from '../api/workflows_management_service';
import type { WorkflowsManagementConfig } from '../config';

const createMockWorkflowsService = (
  overrides: {
    hasAtLeast?: boolean;
    emitEvent?: jest.Mock;
    invokeHook?: jest.Mock;
  } = {}
) => {
  const emitEvent = overrides.emitEvent ?? jest.fn().mockResolvedValue(undefined);
  const invokeHook =
    overrides.invokeHook ??
    jest.fn().mockResolvedValue({ status: 'completed', output: { processed: true } });
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
      workflowsExtensions: {
        invokeHook,
      },
    }),
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

  describe('invokeHook', () => {
    it('delegates invokeHook to workflowsExtensions when available', async () => {
      const invokeHook = jest
        .fn()
        .mockResolvedValue({ status: 'completed', output: { system: 'tokenized' } });
      const service = createMockWorkflowsService({ invokeHook });
      const config = { available: true } as WorkflowsManagementConfig;
      const provider = createWorkflowsClientProvider(service, config, logger);

      const client = await provider(mockRequest);
      const result = await client.invokeHook('inference.beforeCompletion', {
        sessionId: 'abc',
        system: 'raw text',
        messages: [],
      });

      expect(invokeHook).toHaveBeenCalledWith('inference.beforeCompletion', {
        sessionId: 'abc',
        system: 'raw text',
        messages: [],
      });
      expect(result).toEqual({ status: 'completed', output: { system: 'tokenized' } });
    });

    it('returns pass_through when workflows are unavailable', async () => {
      const invokeHook = jest.fn();
      const service = createMockWorkflowsService({ hasAtLeast: false, invokeHook });
      const config = { available: true } as WorkflowsManagementConfig;
      const provider = createWorkflowsClientProvider(service, config, logger);

      const client = await provider(mockRequest);
      const payload = { sessionId: 'abc', messages: [] };
      const result = await client.invokeHook('inference.beforeCompletion', payload);

      expect(invokeHook).not.toHaveBeenCalled();
      expect(result.status).toBe('pass_through');
      expect(result.output).toEqual(payload);
    });
  });
});
