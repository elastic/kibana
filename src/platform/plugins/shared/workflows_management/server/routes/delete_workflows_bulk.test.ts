/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerDeleteWorkflowsBulkRoute } from './delete_workflows_bulk';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './lib/test_utils';
import { API_VERSIONS, WORKFLOWS_API_PATHS } from '../../common/api/constants';
import type { WorkflowsManagementApi } from '../service/workflows_management_api';

jest.mock('./lib/with_license_check', () => ({
  withLicenseCheck: (handler: unknown) => handler,
}));

describe('DELETE /api/workflows', () => {
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
      registerDeleteWorkflowsBulkRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('delete', WORKFLOWS_API_PATHS.BULK_DELETE);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should delete multiple workflows successfully', async () => {
      const mockResult = {
        total: 3,
        deleted: 3,
        failures: [],
      };
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: { ids: ['workflow-123', 'workflow-456', 'workflow-789'] },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
        ['workflow-123', 'workflow-456', 'workflow-789'],
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle empty ids array gracefully', async () => {
      const mockResult = { total: 0, deleted: 0, failures: [] };
      workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: { ids: [] },
        headers: {},
        url: { pathname: '/api/workflows' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith([], 'default', mockRequest);
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: { ids: ['workflow-123', 'workflow-456'] },
        headers: {},
        url: { pathname: '/api/workflows' },
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
