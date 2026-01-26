/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowStatsRoute } from './get_workflow_stats';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflows/stats', () => {
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
      registerGetWorkflowStatsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      // Get the handler function that was passed to router.get
      const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/stats'
      );
      routeHandler = getCall?.[1];
    });

    it('should return workflow statistics successfully', async () => {
      const mockStats = {
        workflows: {
          enabled: 5,
          disabled: 2,
        },
        executions: [
          {
            date: '2024-01-15',
            total: 10,
            successful: 8,
            failed: 2,
          },
          {
            date: '2024-01-14',
            total: 15,
            successful: 12,
            failed: 3,
          },
        ],
      };

      workflowsApi.getWorkflowStats = jest.fn().mockResolvedValue(mockStats);

      const mockRequest = {
        headers: {},
        url: { pathname: '/api/workflows/stats' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowStats).toHaveBeenCalled();
      expect(workflowsApi.getWorkflowStats).toHaveBeenCalledWith('default');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStats });
    });

    it('should return empty stats when no workflows exist', async () => {
      const mockEmptyStats = {
        workflows: {
          enabled: 0,
          disabled: 0,
        },
        executions: [],
      };

      workflowsApi.getWorkflowStats = jest.fn().mockResolvedValue(mockEmptyStats);

      const mockRequest = {
        headers: {},
        url: { pathname: '/api/workflows/stats' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockEmptyStats });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.getWorkflowStats = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockRequest = {
        headers: {},
        url: { pathname: '/api/workflows/stats' },
      };
      const mockResponse = createMockResponse();

      await routeHandler({}, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: `Internal server error: Error: ${errorMessage}`,
        },
      });
    });

    it('should work with different space contexts', async () => {
      const mockStats = {
        workflows: {
          enabled: 3,
          disabled: 1,
        },
        executions: [],
      };

      workflowsApi.getWorkflowStats = jest.fn().mockResolvedValue(mockStats);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/stats' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowStats).toHaveBeenCalledWith('custom-space');
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStats });
    });

    it('should handle Elasticsearch connection errors', async () => {
      const esError = new Error('Connection refused');
      esError.name = 'ConnectionError';

      workflowsApi.getWorkflowStats = jest.fn().mockRejectedValue(esError);

      const mockContext = {};
      const mockRequest = {
        headers: {},
        url: { pathname: '/api/workflows/stats' },
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
