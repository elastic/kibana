/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './lib/test_utils';
import { registerPostSearchWorkflowsRoute } from './post_search_workflows';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

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

  describe('handler logic', () => {
    let routeHandler: any;

    beforeEach(() => {
      registerPostSearchWorkflowsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('post', WORKFLOWS_API_PATHS.SEARCH);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should return workflow search results successfully', async () => {
      const mockSearchResults = {
        page: 1,
        size: 10,
        total: 2,
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
          size: 10,
          page: 1,
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
          size: 10,
          page: 1,
          query: 'test',
          enabled: [true, false],
          createdBy: ['user1@example.com', 'user2@example.com'],
          tags: undefined,
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
        body: { size: 10, page: 1 },
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
  });
});
