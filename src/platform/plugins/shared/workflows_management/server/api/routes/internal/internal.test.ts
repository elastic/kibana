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
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../../../common';

describe('Internal Routes', () => {
  let routeHandlers: Record<string, { handler: (...args: any[]) => Promise<any> }>;
  let mockApi: { disableAllWorkflows: jest.Mock };
  let mockTriggerEventsIsEnabled: boolean;
  let mockSearch: jest.Mock;

  const mockContext = {
    workflows: Promise.resolve({
      isWorkflowsAvailable: true,
      emitEvent: jest.fn(),
      managedWorkflows: {
        install: jest.fn(),
        uninstall: jest.fn(),
        getWorkflowStatus: jest.fn(),
        execute: jest.fn(),
      },
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
    mockSearch = jest.fn().mockResolvedValue({
      hits: { hits: [], total: { value: 0, relation: 'eq' } },
    });

    const mockWorkflowsService = {
      getWorkflowsExecutionEngine: jest.fn().mockImplementation(async () => ({
        triggerEvents: { isEnabled: mockTriggerEventsIsEnabled },
      })),
      getCoreStart: jest.fn().mockResolvedValue({
        elasticsearch: {
          client: {
            asInternalUser: {
              search: mockSearch,
            },
          },
        },
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

  it('should register the executions search route handler', () => {
    expect(routeHandlers[`POST:/internal/workflows/executions/_search`]).toBeDefined();
    expect(routeHandlers[`POST:/internal/workflows/executions/_search`].handler).toEqual(
      expect.any(Function)
    );
  });

  it('should register the executions options list route handler', () => {
    expect(routeHandlers[`POST:/internal/workflows/executions/options_list`]).toBeDefined();
    expect(routeHandlers[`POST:/internal/workflows/executions/options_list`].handler).toEqual(
      expect.any(Function)
    );
  });

  it('should register the executions fields route handler', () => {
    expect(routeHandlers[`GET:/internal/workflows/executions/fields`]).toBeDefined();
    expect(routeHandlers[`GET:/internal/workflows/executions/fields`].handler).toEqual(
      expect.any(Function)
    );
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

  it('should execute scoped executions search with enforced filters', async () => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/workflows/executions/_search',
      body: {
        query: { term: { workflowId: 'wf-1' } },
        from: 25,
        size: 25,
        sort: [{ startedAt: { order: 'desc' } }],
        trackTotalHits: true,
      },
    });

    await routeHandlers[`POST:/internal/workflows/executions/_search`].handler(
      mockContext,
      request,
      response
    );

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        from: 25,
        size: 25,
        sort: [{ startedAt: { order: 'desc' } }],
        track_total_hits: true,
        query: {
          bool: {
            must: [
              { term: { workflowId: 'wf-1' } },
              {
                bool: {
                  should: [
                    { term: { spaceId: 'default' } },
                    { bool: { must_not: { exists: { field: 'spaceId' } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
            ],
            must_not: [{ exists: { field: 'stepId' } }],
          },
        },
      })
    );
    expect(response.ok).toHaveBeenCalledWith({
      body: { hits: { hits: [], total: { value: 0, relation: 'eq' } } },
    });
  });

  it('should execute options list search with enforced space and step filters', async () => {
    mockSearch.mockResolvedValue({
      aggregations: {
        suggestions: {
          buckets: [{ key: 'completed', doc_count: 4 }],
        },
        totalCardinality: { value: 1 },
        validation: {
          buckets: {
            completed: { doc_count: 4 },
          },
        },
      },
    });

    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      method: 'post',
      path: '/internal/workflows/executions/options_list',
      body: {
        size: 10,
        fieldName: 'status',
        filters: [{ term: { workflowId: 'wf-1' } }],
        selectedOptions: ['completed'],
      },
    });

    await routeHandlers[`POST:/internal/workflows/executions/options_list`].handler(
      mockContext,
      request,
      response
    );

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        index: WORKFLOWS_EXECUTIONS_INDEX,
        query: {
          bool: {
            filter: expect.arrayContaining([
              { term: { workflowId: 'wf-1' } },
              {
                bool: {
                  should: [
                    { term: { spaceId: 'default' } },
                    { bool: { must_not: { exists: { field: 'spaceId' } } } },
                  ],
                  minimum_should_match: 1,
                },
              },
              { bool: { must_not: { exists: { field: 'stepId' } } } },
            ]),
          },
        },
      })
    );

    expect(response.ok).toHaveBeenCalledWith({
      body: {
        suggestions: [{ value: 'completed', docCount: 4 }],
        totalCardinality: 1,
        invalidSelections: [],
      },
    });
  });
});
