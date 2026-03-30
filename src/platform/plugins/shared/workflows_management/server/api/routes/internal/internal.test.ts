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
  let mockGetWorkflowExecutionEngine: jest.Mock;
  let mockEngine: { isEventDrivenExecutionEnabled: jest.Mock };

  const mockContext = {
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

    mockEngine = { isEventDrivenExecutionEnabled: jest.fn() };
    mockGetWorkflowExecutionEngine = jest.fn().mockResolvedValue(mockEngine);

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
      },
    } as unknown as jest.Mocked<IRouter>;

    registerInternalRoutes({
      router: mockRouter as any,
      getWorkflowExecutionEngine: mockGetWorkflowExecutionEngine,
    });
  });

  it('should register the config route handler', () => {
    expect(routeHandlers[`GET:/internal/workflows/config`]).toBeDefined();
    expect(routeHandlers[`GET:/internal/workflows/config`].handler).toEqual(expect.any(Function));
  });

  it('should return eventDrivenExecutionEnabled true when engine returns true', async () => {
    mockEngine.isEventDrivenExecutionEnabled.mockReturnValue(true);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`GET:/internal/workflows/config`].handler(mockContext, request, response);

    expect(mockGetWorkflowExecutionEngine).toHaveBeenCalledTimes(1);
    expect(mockEngine.isEventDrivenExecutionEnabled).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: true },
    });
  });

  it('should return eventDrivenExecutionEnabled false when engine returns false', async () => {
    mockEngine.isEventDrivenExecutionEnabled.mockReturnValue(false);

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest();

    await routeHandlers[`GET:/internal/workflows/config`].handler(mockContext, request, response);

    expect(mockGetWorkflowExecutionEngine).toHaveBeenCalledTimes(1);
    expect(mockEngine.isEventDrivenExecutionEnabled).toHaveBeenCalledTimes(1);
    expect(response.ok).toHaveBeenCalledWith({
      body: { eventDrivenExecutionEnabled: false },
    });
  });
});
