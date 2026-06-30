/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerPostBulkCreateWorkflowsRoute } from './post_bulk_create_workflows';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('POST /api/workflows/_bulk_create', () => {
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
      registerPostBulkCreateWorkflowsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
        (call) => call[0].path === '/api/workflows/_bulk_create'
      );
      routeHandler = postCall?.[1];
    });

    it('should bulk create workflows successfully', async () => {
      const mockResult = {
        created: [
          { id: 'workflow-1', name: 'Workflow 1', enabled: true, valid: true },
          { id: 'workflow-2', name: 'Workflow 2', enabled: true, valid: true },
        ],
        failed: [],
      };

      workflowsApi.bulkCreateWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflows: [
            { yaml: 'name: Workflow 1\ntriggers:\n  - type: manual\nsteps: []' },
            { yaml: 'name: Workflow 2\ntriggers:\n  - type: manual\nsteps: []' },
          ],
        },
        headers: {},
        url: { pathname: '/api/workflows/_bulk_create' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).toHaveBeenCalledWith(
        mockRequest.body.workflows,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle partial failures', async () => {
      const mockResult = {
        created: [{ id: 'workflow-1', name: 'Workflow 1', enabled: true, valid: true }],
        failed: [{ index: 1, error: 'Invalid YAML syntax' }],
      };

      workflowsApi.bulkCreateWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflows: [
            { yaml: 'name: Workflow 1\ntriggers:\n  - type: manual\nsteps: []' },
            { yaml: 'invalid: yaml: [' },
          ],
        },
        headers: {},
        url: { pathname: '/api/workflows/_bulk_create' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Elasticsearch connection failed';
      workflowsApi.bulkCreateWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        body: {
          workflows: [{ yaml: 'name: Test Workflow' }],
        },
        headers: {},
        url: { pathname: '/api/workflows/_bulk_create' },
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
      const mockResult = {
        created: [{ id: 'workflow-1', name: 'Workflow 1' }],
        failed: [],
      };

      workflowsApi.bulkCreateWorkflows = jest.fn().mockResolvedValue(mockResult);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        body: {
          workflows: [{ yaml: 'name: Workflow 1' }],
        },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/_bulk_create' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).toHaveBeenCalledWith(
        mockRequest.body.workflows,
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });

    it('should support custom IDs in bulk create', async () => {
      const mockResult = {
        created: [
          { id: 'workflow-custom-1', name: 'Workflow 1' },
          { id: 'workflow-custom-2', name: 'Workflow 2' },
        ],
        failed: [],
      };

      workflowsApi.bulkCreateWorkflows = jest.fn().mockResolvedValue(mockResult);

      const mockContext = {};
      const mockRequest = {
        body: {
          workflows: [
            { yaml: 'name: Workflow 1', id: 'workflow-custom-1' },
            { yaml: 'name: Workflow 2', id: 'workflow-custom-2' },
          ],
        },
        headers: {},
        url: { pathname: '/api/workflows/_bulk_create' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.bulkCreateWorkflows).toHaveBeenCalledWith(
        mockRequest.body.workflows,
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockResult });
    });
  });
});
