/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetWorkflowJsonSchemaRoute } from './get_workflow_json_schema';
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

describe('GET /api/workflows/workflow-json-schema', () => {
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
      registerGetWorkflowJsonSchemaRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
      const route = mockRouter.versioned.getRoute('get', WORKFLOWS_API_PATHS.JSON_SCHEMA);
      routeHandler = route.versions[API_VERSIONS.public.v1].handler;
    });

    it('should return workflow JSON schema successfully', async () => {
      const mockJsonSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name' },
          description: { type: 'string', description: 'Workflow description' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Step ID' },
                name: { type: 'string', description: 'Step name' },
                type: { type: 'string', description: 'Step type' },
                inputs: { type: 'object', description: 'Step inputs' },
              },
              required: ['id', 'name', 'type'],
            },
          },
        },
        required: ['name', 'steps'],
      };

      workflowsApi.getWorkflowJsonSchema = jest.fn().mockResolvedValue(mockJsonSchema);

      const mockContext = {};
      const mockRequest = {
        query: { loose: false },
        headers: {},
        url: { pathname: '/api/workflows/workflow-json-schema' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowJsonSchema).toHaveBeenCalledWith(
        { loose: false },
        'default',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockJsonSchema });
    });

    it('should handle API errors gracefully', async () => {
      const errorMessage = 'Schema generation failed';
      workflowsApi.getWorkflowJsonSchema = jest.fn().mockRejectedValue(new Error(errorMessage));

      const mockContext = {};
      const mockRequest = {
        query: { loose: false },
        headers: {},
        url: { pathname: '/api/workflows/workflow-json-schema' },
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
      const mockJsonSchema = {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Workflow name' },
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                type: { type: 'string' },
              },
              required: ['id', 'name', 'type'],
            },
          },
        },
        required: ['name', 'steps'],
      };

      workflowsApi.getWorkflowJsonSchema = jest.fn().mockResolvedValue(mockJsonSchema);
      mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

      const mockContext = {};
      const mockRequest = {
        query: { loose: false },
        headers: {},
        url: { pathname: '/s/custom-space/api/workflows/workflow-json-schema' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(workflowsApi.getWorkflowJsonSchema).toHaveBeenCalledWith(
        { loose: false },
        'custom-space',
        mockRequest
      );
      expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockJsonSchema });
    });

    it('should handle schema generation errors', async () => {
      const schemaError = new Error('Zod schema compilation failed');
      workflowsApi.getWorkflowJsonSchema = jest.fn().mockRejectedValue(schemaError);

      const mockContext = {};
      const mockRequest = {
        query: { loose: false },
        headers: {},
        url: { pathname: '/api/workflows/workflow-json-schema' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: Zod schema compilation failed',
        },
      });
    });

    it('should handle service initialization errors', async () => {
      const serviceError = new Error('WorkflowsService not initialized');
      workflowsApi.getWorkflowJsonSchema = jest.fn().mockRejectedValue(serviceError);

      const mockContext = {};
      const mockRequest = {
        query: { loose: false },
        headers: {},
        url: { pathname: '/api/workflows/workflow-json-schema' },
      };
      const mockResponse = createMockResponse();

      await routeHandler(mockContext, mockRequest, mockResponse);

      expect(mockResponse.customError).toHaveBeenCalledWith({
        statusCode: 500,
        body: {
          message: 'Internal server error: Error: WorkflowsService not initialized',
        },
      });
    });
  });
});
