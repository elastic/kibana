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
import { KQLSyntaxError } from '@kbn/es-query';
import { registerInternalRoutes } from '.';

describe('Internal Routes', () => {
  let routeHandlers: Record<string, { handler: (...args: any[]) => Promise<any> }>;
  let mockApi: { disableAllWorkflows: jest.Mock };
  let mockTriggerEventsIsEnabled: boolean;
  const mockSearchTriggerEventLog = jest.fn();

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
    mockSearchTriggerEventLog.mockResolvedValue({
      hits: [],
      total: 0,
      page: 1,
      size: 10,
    });
    mockApi = { disableAllWorkflows: jest.fn() };

    const mockWorkflowsService = {
      getWorkflowsExecutionEngine: jest.fn().mockImplementation(async () => ({
        triggerEvents: {
          isEnabled: mockTriggerEventsIsEnabled,
          searchTriggerEventLog: mockSearchTriggerEventLog,
        },
      })),
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

  it('should register trigger event log search routes', () => {
    expect(routeHandlers[`POST:/internal/workflows/trigger_events/_search`]).toBeDefined();
  });

  it('forwards trigger event log search params to the execution engine', async () => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { triggerIds: ['t1'], kql: 'triggerId : x', page: 2, size: 25 },
    });

    await routeHandlers[`POST:/internal/workflows/trigger_events/_search`].handler(
      mockContext,
      request,
      response
    );

    expect(mockSearchTriggerEventLog).toHaveBeenCalledWith({
      spaceId: 'default',
      triggerIds: ['t1'],
      kql: 'triggerId : x',
      from: undefined,
      to: undefined,
      page: 2,
      size: 25,
    });
    expect(response.ok).toHaveBeenCalledWith({
      body: { hits: [], total: 0, page: 1, size: 10 },
    });
  });

  it('returns 400 when trigger event log search throws KQLSyntaxError', async () => {
    const kqlError = new KQLSyntaxError(
      {
        message: 'Expected',
        expected: null,
        found: '',
        location: { start: { offset: 0 } },
      } as ConstructorParameters<typeof KQLSyntaxError>[0],
      'bad:'
    );
    mockSearchTriggerEventLog.mockRejectedValueOnce(kqlError);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({ body: {} });

    await routeHandlers[`POST:/internal/workflows/trigger_events/_search`].handler(
      mockContext,
      request,
      response
    );

    expect(response.badRequest).toHaveBeenCalledWith({
      body: { message: kqlError.shortMessage },
    });
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
});
