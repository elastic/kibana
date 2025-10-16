/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { defineRoutes } from './workflows_management_routes';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { mockRouter as createMockRouter } from '@kbn/core-http-router-server-mocks';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsManagementApi } from './workflows_management_api';

// Use Kibana's built-in mock utilities where available
const mockLogger = loggingSystemMock.create().get();
const mockRouter = createMockRouter.create();

interface MockSpaces {
  getSpaceId: (req: unknown) => Promise<string>;
}
export const createSpacesMock = (id = 'default'): jest.Mocked<MockSpaces> => ({
  getSpaceId: jest.fn().mockReturnValue(id),
});

describe('Workflow Management Routes', () => {
  let workflowsApi: WorkflowsManagementApi;
  const mockSpaces = createSpacesMock() as unknown as SpacesServiceStart;

  beforeEach(() => {
    // Create a mock object that automatically creates jest.fn() for any property access
    workflowsApi = new Proxy(
      {},
      {
        get: (target: Record<string, unknown>, prop: string) => {
          if (!target[prop]) {
            target[prop] = jest.fn();
          }
          return target[prop];
        },
      }
    ) as any;
    jest.clearAllMocks();
    // Reset spaces mock to default
    mockSpaces.getSpaceId = jest.fn().mockReturnValue('default');
  });

  describe('/api/workflows/stats', () => {
    describe('GET /api/workflows/stats route definition', () => {
      it('should define the stats route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        expect(mockRouter.get).toHaveBeenCalledWith(
          expect.objectContaining({
            path: '/api/workflows/stats',
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
            validate: false,
          }),
          expect.any(Function)
        );
      });
    });

    describe('GET /api/workflows/stats handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
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

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/stats' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

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

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/stats' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockEmptyStats });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getWorkflowStats = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/stats' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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

  describe('/api/workflows/{id}', () => {
    describe('GET /api/workflows/{id} route definition', () => {
      it('should define the get workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getWorkflowCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );

        expect(getWorkflowCall).toBeDefined();
        expect(getWorkflowCall[0]).toMatchObject({
          path: '/api/workflows/{id}',
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
        expect(getWorkflowCall[0].validate).toBeDefined();
        expect(getWorkflowCall[0].validate.params).toBeDefined();
        expect(getWorkflowCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflows/{id} handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );
        routeHandler = getCall?.[1];
      });

      it('should return workflow details successfully', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Test Workflow',
          description: 'A test workflow for demonstration',
          enabled: true,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
          lastUpdatedBy: 'user@example.com',
          definition: {
            name: 'Test Workflow',
            description: 'A test workflow for demonstration',
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                type: 'action',
                action: 'test-action',
              },
            ],
          },
          yaml: 'name: Test Workflow\ndescription: A test workflow for demonstration\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          valid: true,
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockWorkflow });
      });

      it('should return 404 when workflow is not found', async () => {
        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'non-existent-workflow' },
          headers: {},
          url: { pathname: '/api/workflows/non-existent-workflow' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
        expect(mockResponse.notFound).toHaveBeenCalledWith({
          body: {
            message: 'Workflow not found',
          },
        });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: `Internal server error: Error: ${errorMessage}`,
          },
        });
      });

      it('should work with different space contexts', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
          createdAt: new Date(),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date(),
          lastUpdatedBy: 'user@example.com',
          definition: null,
          yaml: '',
          valid: true,
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockWorkflow });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getWorkflow = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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
});
