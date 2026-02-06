/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowAggsRoute } from './get_workflow_aggs';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflows/aggs', () => {
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
      registerGetWorkflowAggsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/aggs'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow aggregations successfully', async () => {
      const mockAggs = {
        tags: [
          { key: 'test', label: 'test', doc_count: 5 },
          { key: 'prod', label: 'prod', doc_count: 3 },
        ],
        createdBy: [
          { key: 'user1@example.com', label: 'user1@example.com', doc_count: 8 },
          { key: 'user2@example.com', label: 'user2@example.com', doc_count: 2 },
        ],
      };

      workflowsApi.getWorkflowAggs = jest.fn().mockResolvedValue(mockAggs);

      const mockContext = {};
      const mockRequest = {
        query: { fields: ['tags', 'createdBy'] },
        headers: {},
        url: { pathname: '/api/workflows/aggs' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowAggs).toHaveBeenCalledWith(['tags', 'createdBy'], 'default');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockAggs });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflowAggs = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        query: { fields: ['tags'] },
        headers: {},
        url: { pathname: '/api/workflows/aggs' },
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
      const mockAggs = {
        tags: [{ key: 'space-specific', label: 'space-specific', doc_count: 2 }],
      };

      workflowsApi.getWorkflowAggs = jest.fn().mockResolvedValue(mockAggs);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        query: { fields: ['tags'] },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/aggs' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowAggs).toHaveBeenCalledWith(['tags'], 'custom-space');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockAggs });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflowAggs = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        query: { fields: ['tags'] },
        headers: {},
        url: { pathname: '/api/workflows/aggs' },
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
