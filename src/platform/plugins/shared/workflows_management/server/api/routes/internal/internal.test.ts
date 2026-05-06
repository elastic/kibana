/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { registerInternalRoutes } from '.';

describe('Internal Routes', () => {
  let routeHandlers: Record<string, { handler: (...args: any[]) => Promise<any> }>;
  let mockApi: { disableAllWorkflows: jest.Mock };
  let mockExecutionEngine: {
    emitO11yTestErrorLog: jest.Mock;
    scheduleO11yTestFailures: jest.Mock;
    triggerEvents: { isEnabled: boolean };
  };
  let mockTriggerEventsIsEnabled: boolean;

  const mockContext = {
    workflows: Promise.resolve({
      isWorkflowsAvailable: true,
      emitEvent: jest.fn(),
    }),
    licensing: Promise.resolve({
      license: {
        isAvailable: true,
        isActive: true,
        hasAtLeast: jest.fn().mockReturnValue(true),
        type: 'enterprise',
      },
    }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    routeHandlers = {};
    mockTriggerEventsIsEnabled = true;

    mockApi = { disableAllWorkflows: jest.fn() };
    mockExecutionEngine = {
      emitO11yTestErrorLog: jest.fn(),
      scheduleO11yTestFailures: jest.fn().mockResolvedValue({
        scheduled: [{ taskId: 'workflow:o11y-test:run:1', taskType: 'workflow:run' }],
      }),
      triggerEvents: { isEnabled: mockTriggerEventsIsEnabled },
    };

    const mockWorkflowsService = {
      getWorkflowsExecutionEngine: jest.fn().mockImplementation(async () => {
        mockExecutionEngine.triggerEvents.isEnabled = mockTriggerEventsIsEnabled;
        return mockExecutionEngine;
      }),
    };

    const createVersionedRoute = (method: string, path: string) => ({
      addVersion: jest
        .fn()
        .mockImplementation((_config: unknown, handler: (...args: any[]) => Promise<any>) => {
          routeHandlers[`${method}:${path}`] = { handler };
          return { addVersion: jest.fn() };
        }),
    });

    const mockRouter = {
      versioned: {
        get: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('GET', config.path)
          ),
        post: jest
          .fn()
          .mockImplementation((config: { path: string }) =>
            createVersionedRoute('POST', config.path)
          ),
      },
    } as unknown as jest.Mocked<IRouter>;

    registerInternalRoutes({
      router: mockRouter as any,
      api: mockApi as any,
      service: mockWorkflowsService as any,
      logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } as any,
      spaces: { getSpaceId: jest.fn().mockReturnValue('default') } as any,
      audit: {} as any,
    });
  });

  it('should register the config route handler', () => {
    expect(routeHandlers[`GET:/internal/workflows/config`]).toBeDefined();
    expect(routeHandlers[`GET:/internal/workflows/config`].handler).toEqual(expect.any(Function));
  });

  it('should return eventDrivenExecutionEnabled true when engine returns true', async () => {
    mockTriggerEventsIsEnabled = true;

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`GET:/internal/workflows/config`].handler(mockContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: true },
    });
  });

  it('should return eventDrivenExecutionEnabled false when engine returns false', async () => {
    mockTriggerEventsIsEnabled = false;

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`GET:/internal/workflows/config`].handler(mockContext, request, response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: false },
    });
  });

  it('should register the disable route handler', () => {
    expect(routeHandlers[`POST:/internal/workflows/disable`]).toBeDefined();
    expect(routeHandlers[`POST:/internal/workflows/disable`].handler).toEqual(expect.any(Function));
  });

  it('should register the o11y test route handlers', () => {
    expect(routeHandlers[`POST:/api/workflows/o11y_test/500`]).toBeDefined();
    expect(routeHandlers[`POST:/internal/workflows/o11y_test/signals`]).toBeDefined();
  });

  it('should call api.disableAllWorkflows scoped to the request space', async () => {
    mockApi.disableAllWorkflows.mockResolvedValue({ total: 3, disabled: 3, failures: [] });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`POST:/internal/workflows/disable`].handler(mockContext, request, response);

    expect(mockApi.disableAllWorkflows).toHaveBeenCalledWith('default');
    expect(response.ok).toHaveBeenCalledWith({
      body: { total: 3, disabled: 3, failures: [] },
    });
  });

  it('should return an intentional 500 for workflow API alert validation', async () => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`POST:/api/workflows/o11y_test/500`].handler(
      mockContext,
      request,
      response
    );

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: {
        message: '[WORKFLOWS_O11Y_ALERT_TEST] intentional workflow API 5xx for QA alert validation',
      },
    });
  });

  it('should emit logs and schedule o11y test task failures', async () => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: {
        confirm: 'workflow-o11y-qa-test',
        emitPluginErrors: true,
        runTaskFailures: 3,
        resumeTaskFailures: 4,
        scheduledTaskFailures: 5,
      },
    });

    await routeHandlers[`POST:/internal/workflows/o11y_test/signals`].handler(
      mockContext,
      request,
      response
    );

    expect(mockExecutionEngine.emitO11yTestErrorLog).toHaveBeenCalled();
    expect(mockExecutionEngine.scheduleO11yTestFailures).toHaveBeenCalledWith({
      request,
      spaceId: 'default',
      counts: {
        run: 3,
        resume: 4,
        scheduled: 5,
      },
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: {
        spaceId: 'default',
        scheduled: [{ taskId: 'workflow:o11y-test:run:1', taskType: 'workflow:run' }],
      },
    });
  });
});
