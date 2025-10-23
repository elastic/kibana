/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostSearchWorkflowsRoute } from './post_search_workflows';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

describe('POST /api/workflows/search', () => {
  let workflowsApi: WorkflowsManagementApi;
  let mockRouter: any;
  let mockSpaces: any;

  beforeEach(() => {
    mockRouter = createMockRouterInstance();
    workflowsApi = createMockWorkflowsApi();
    mockSpaces = createSpacesMock();
    jest.clearAllMocks();
  });

  describe('route definition', () => {
    it('should define the search route with correct configuration', () => {
      registerPostSearchWorkflowsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });

      const postSearchCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/search'
      );

      expect(postSearchCall).toBeDefined();
      expect(postSearchCall[0]).toMatchObject({
        path: '/api/workflows/search',
        options: {
          tags: ['api', 'workflows'],
        },
        security: {
          authz: {
            requiredPrivileges: [
              {
                anyRequired: ['read', 'workflow_read'],
              },
            ],
          },
        },
      });
      expect(postSearchCall[0].validate).toBeDefined();
      expect(postSearchCall[0].validate.body).toBeDefined();
      expect(postSearchCall[1]).toEqual(expect.any(Function));
    });
  });

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerPostSearchWorkflowsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.post
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/search'
      );
      routeHandler = postCall?.[1];
    });

    it('should return workflow search results successfully', async () => {
      const mockSearchResults = {
        _pagination: {
          page: 0,
          limit: 10,
          total: 2,
        },
        results: [
          {
            id: 'workflow-1',
            name: 'Test Workflow 1',
            description: 'First test workflow',
            enabled: true,
            createdAt: new Date('2024-01-15T10:00:00Z'),
            createdBy: 'user1@example.com',
            lastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
            lastUpdatedBy: 'user1@example.com',
            definition: null,
            yaml: '',
            valid: true,
            history: [],
          },
          {
            id: 'workflow-2',
            name: 'Test Workflow 2',
            description: 'Second test workflow',
            enabled: false,
            createdAt: new Date('2024-01-14T09:00:00Z'),
            createdBy: 'user2@example.com',
            lastUpdatedAt: new Date('2024-01-14T09:15:00Z'),
            lastUpdatedBy: 'user2@example.com',
            definition: null,
            yaml: '',
            valid: true,
            history: [],
          },
        ],
      };

      workflowsApi.getWorkflows = jest.fn().mockResolvedValue(mockSearchResults);

      const mockContext = {};
      const mockRequest = {
        body: {
          limit: 10,
          page: 0,
          query: 'test',
          enabled: [true, false],
          createdBy: ['user1@example.com', 'user2@example.com'],
        },
        headers: {},
        url: { pathname: '/api/workflows/search' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
        {
          limit: 10,
          page: 0,
          query: 'test',
          enabled: [true, false],
          createdBy: ['user1@example.com', 'user2@example.com'],
        },
        'default'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockSearchResults });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
          limit: 10,
          page: 0,
        },
        headers: {},
        url: { pathname: '/api/workflows/search' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: `Internal server error: Error: ${errorMessage}`,
        },
      });
    });

    it('should work with different space contexts', async () => {
      const mockSearchResults = {
        _pagination: {
          page: 0,
          limit: 10,
          total: 1,
        },
        results: [
          {
            id: 'workflow-1',
            name: 'Space-specific Workflow',
            description: 'Workflow in custom space',
            enabled: true,
            createdAt: new Date(),
            createdBy: 'user@example.com',
            lastUpdatedAt: new Date(),
            lastUpdatedBy: 'user@example.com',
            definition: null,
            yaml: '',
            valid: true,
            history: [],
          },
        ],
      };

      workflowsApi.getWorkflows = jest.fn().mockResolvedValue(mockSearchResults);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          limit: 10,
          page: 0,
          query: 'space-specific',
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/search' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflows).toHaveBeenCalledWith(
        {
          limit: 10,
          page: 0,
          query: 'space-specific',
        },
        'custom-space'
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockSearchResults });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflows = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        body: {
          limit: 10,
          page: 0,
        },
        headers: {},
        url: { pathname: '/api/workflows/search' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: ConnectionError: Connection refused',
        },
      });
    });
  });
});
