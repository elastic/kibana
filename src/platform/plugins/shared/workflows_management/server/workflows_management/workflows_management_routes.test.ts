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

  describe('/api/workflows/aggs', () => {
    describe('GET /api/workflows/aggs route definition', () => {
      it('should define the aggs route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getAggsCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/aggs'
        );

        expect(getAggsCall).toBeDefined();
        expect(getAggsCall[0]).toMatchObject({
          path: '/api/workflows/aggs',
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
        expect(getAggsCall[0].validate).toBeDefined();
        expect(getAggsCall[0].validate.query).toBeDefined();
        expect(getAggsCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflows/aggs handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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

  describe('/api/workflows/connectors', () => {
    describe('GET /api/workflows/connectors route definition', () => {
      it('should define the connectors route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getConnectorsCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/connectors'
        );

        expect(getConnectorsCall).toBeDefined();
        expect(getConnectorsCall[0]).toMatchObject({
          path: '/api/workflows/connectors',
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
        expect(getConnectorsCall[0].validate).toBe(false);
        expect(getConnectorsCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflows/connectors handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/connectors'
        );
        routeHandler = getCall?.[1];
      });

      it('should return available connectors successfully', async () => {
        const mockConnectors = {
          connectorsByType: {
            '.email': {
              actionTypeId: '.email',
              displayName: 'Email',
              instances: [
                {
                  id: 'email-connector-1',
                  name: 'Email Connector 1',
                  isPreconfigured: false,
                  isDeprecated: false,
                },
              ],
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
              subActions: [
                {
                  name: 'send',
                  displayName: 'Send Email',
                },
              ],
            },
            '.webhook': {
              actionTypeId: '.webhook',
              displayName: 'Webhook',
              instances: [
                {
                  id: 'webhook-connector-1',
                  name: 'Webhook Connector 1',
                  isPreconfigured: true,
                  isDeprecated: false,
                },
              ],
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
              subActions: [],
            },
          },
          totalConnectors: 2,
        };

        workflowsApi.getAvailableConnectors = jest.fn().mockResolvedValue(mockConnectors);

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/connectors' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getAvailableConnectors).toHaveBeenCalledWith('default', mockRequest);
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            connectorTypes: mockConnectors.connectorsByType,
            totalConnectors: mockConnectors.totalConnectors,
          },
        });
      });

      it('should return empty connectors when none exist', async () => {
        const mockEmptyConnectors = {
          connectorsByType: {},
          totalConnectors: 0,
        };

        workflowsApi.getAvailableConnectors = jest.fn().mockResolvedValue(mockEmptyConnectors);

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/connectors' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getAvailableConnectors).toHaveBeenCalledWith('default', mockRequest);
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            connectorTypes: {},
            totalConnectors: 0,
          },
        });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Actions client not available';
        workflowsApi.getAvailableConnectors = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/connectors' },
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
        const mockConnectors = {
          connectorsByType: {
            '.slack': {
              actionTypeId: '.slack',
              displayName: 'Slack',
              instances: [
                {
                  id: 'slack-connector-1',
                  name: 'Slack Connector 1',
                  isPreconfigured: false,
                  isDeprecated: false,
                },
              ],
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'basic',
              subActions: [],
            },
          },
          totalConnectors: 1,
        };

        workflowsApi.getAvailableConnectors = jest.fn().mockResolvedValue(mockConnectors);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/connectors' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getAvailableConnectors).toHaveBeenCalledWith(
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            connectorTypes: mockConnectors.connectorsByType,
            totalConnectors: mockConnectors.totalConnectors,
          },
        });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getAvailableConnectors = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/connectors' },
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

      it('should handle connectors with sub-actions', async () => {
        const mockConnectors = {
          connectorsByType: {
            '.servicenow': {
              actionTypeId: '.servicenow',
              displayName: 'ServiceNow',
              instances: [],
              enabled: true,
              enabledInConfig: true,
              enabledInLicense: true,
              minimumLicenseRequired: 'platinum',
              subActions: [
                {
                  name: 'createIncident',
                  displayName: 'Create Incident',
                },
                {
                  name: 'updateIncident',
                  displayName: 'Update Incident',
                },
              ],
            },
          },
          totalConnectors: 0,
        };

        workflowsApi.getAvailableConnectors = jest.fn().mockResolvedValue(mockConnectors);

        const mockContext = {};
        const mockRequest = {
          headers: {},
          url: { pathname: '/api/workflows/connectors' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getAvailableConnectors).toHaveBeenCalledWith('default', mockRequest);
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            connectorTypes: mockConnectors.connectorsByType,
            totalConnectors: mockConnectors.totalConnectors,
          },
        });
      });
    });
  });

  describe('/api/workflows/search', () => {
    describe('POST /api/workflows/search route definition', () => {
      it('should define the search route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

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

    describe('POST /api/workflows/search handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

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

  describe('/api/workflows (POST)', () => {
    describe('POST /api/workflows route definition', () => {
      it('should define the create workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postCreateCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows'
        );

        expect(postCreateCall).toBeDefined();
        expect(postCreateCall[0]).toMatchObject({
          path: '/api/workflows',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['all', 'workflow_create'],
                },
              ],
            },
          },
        });
        expect(postCreateCall[0].validate).toBeDefined();
        expect(postCreateCall[0].validate.body).toBeDefined();
        expect(postCreateCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflows handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows'
        );
        routeHandler = postCall?.[1];
      });

      it('should create workflow successfully', async () => {
        const mockCreatedWorkflow = {
          id: 'new-workflow-123',
          name: 'New Test Workflow',
          description: 'A newly created test workflow',
          enabled: true,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date('2024-01-15T10:00:00Z'),
          lastUpdatedBy: 'user@example.com',
          definition: {
            name: 'New Test Workflow',
            description: 'A newly created test workflow',
            triggers: [],
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                type: 'action',
                action: 'test-action',
              },
            ],
          },
          yaml: 'name: New Test Workflow\ndescription: A newly created test workflow\ntriggers: []\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          valid: true,
        };

        workflowsApi.createWorkflow = jest.fn().mockResolvedValue(mockCreatedWorkflow);

        const mockContext = {};
        const mockRequest = {
          body: {
            yaml: 'name: New Test Workflow\ndescription: A newly created test workflow\ntriggers: []\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          },
          headers: {},
          url: { pathname: '/api/workflows' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockCreatedWorkflow });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.createWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          body: {
            yaml: 'name: Test Workflow',
          },
          headers: {},
          url: { pathname: '/api/workflows' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
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
        const mockCreatedWorkflow = {
          id: 'new-workflow-123',
          name: 'Space-specific Workflow',
          description: 'Workflow created in custom space',
          enabled: true,
          createdAt: new Date(),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date(),
          lastUpdatedBy: 'user@example.com',
          definition: null,
          yaml: 'name: Space-specific Workflow',
          valid: true,
        };

        workflowsApi.createWorkflow = jest.fn().mockResolvedValue(mockCreatedWorkflow);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          body: {
            yaml: 'name: Space-specific Workflow',
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
          mockRequest.body,
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockCreatedWorkflow });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.createWorkflow = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          body: {
            yaml: 'name: Test Workflow',
          },
          headers: {},
          url: { pathname: '/api/workflows' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
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

      it('should handle YAML parsing errors', async () => {
        const yamlError = new Error('Invalid workflow yaml: YAML parsing failed');
        workflowsApi.createWorkflow = jest.fn().mockRejectedValue(yamlError);

        const mockContext = {};
        const mockRequest = {
          body: {
            yaml: 'invalid: yaml: content: [',
          },
          headers: {},
          url: { pathname: '/api/workflows' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.createWorkflow).toHaveBeenCalledWith(
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Invalid workflow yaml: YAML parsing failed',
          },
        });
      });
    });
  });

  describe('/api/workflows/{id} (PUT)', () => {
    describe('PUT /api/workflows/{id} route definition', () => {
      it('should define the update workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const putUpdateCall = (mockRouter.put as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );

        expect(putUpdateCall).toBeDefined();
        expect(putUpdateCall[0]).toMatchObject({
          path: '/api/workflows/{id}',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['all', 'workflow_update'],
                },
              ],
            },
          },
        });
        expect(putUpdateCall[0].validate).toBeDefined();
        expect(putUpdateCall[0].validate.params).toBeDefined();
        expect(putUpdateCall[0].validate.body).toBeDefined();
        expect(putUpdateCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('PUT /api/workflows/{id} handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.put
        const putCall = (mockRouter.put as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );
        routeHandler = putCall?.[1];
      });

      it('should update workflow successfully', async () => {
        const mockUpdatedWorkflow = {
          id: 'workflow-123',
          lastUpdatedAt: new Date('2024-01-15T11:00:00Z'),
          lastUpdatedBy: 'user@example.com',
          enabled: true,
          valid: true,
          validationErrors: [],
        };

        workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            name: 'Updated Workflow',
            description: 'Updated description',
            enabled: true,
            tags: ['updated', 'workflow'],
            yaml: 'name: Updated Workflow\ndescription: Updated description\nenabled: true\ntags: [updated, workflow]',
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
          'workflow-123',
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
      });

      it('should return 404 when workflow is not found', async () => {
        workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'non-existent-workflow' },
          body: {
            name: 'Updated Workflow',
            enabled: true,
          },
          headers: {},
          url: { pathname: '/api/workflows/non-existent-workflow' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
          'non-existent-workflow',
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.notFound).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.updateWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            name: 'Updated Workflow',
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
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
        const mockUpdatedWorkflow = {
          id: 'workflow-123',
          lastUpdatedAt: new Date(),
          lastUpdatedBy: 'user@example.com',
          enabled: true,
          valid: true,
          validationErrors: [],
        };

        workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            name: 'Space-specific Updated Workflow',
            enabled: true,
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
          'workflow-123',
          mockRequest.body,
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.updateWorkflow = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            name: 'Updated Workflow',
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
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

      it('should handle partial updates', async () => {
        const mockUpdatedWorkflow = {
          id: 'workflow-123',
          lastUpdatedAt: new Date(),
          lastUpdatedBy: 'user@example.com',
          enabled: false,
          valid: true,
          validationErrors: [],
        };

        workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            enabled: false,
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
          'workflow-123',
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
      });

      it('should handle update with validation errors', async () => {
        const mockUpdatedWorkflow = {
          id: 'workflow-123',
          lastUpdatedAt: new Date(),
          lastUpdatedBy: 'user@example.com',
          enabled: true,
          valid: false,
          validationErrors: ['Invalid step configuration', 'Missing required field'],
        };

        workflowsApi.updateWorkflow = jest.fn().mockResolvedValue(mockUpdatedWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            yaml: 'name: Invalid Workflow\nsteps:\n  - id: step1\n    type: action',
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = {
          ok: jest.fn().mockReturnThis(),
          notFound: jest.fn().mockReturnThis(),
          badRequest: jest.fn().mockReturnThis(),
          customError: jest.fn().mockReturnThis(),
        };

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.updateWorkflow).toHaveBeenCalledWith(
          'workflow-123',
          mockRequest.body,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockUpdatedWorkflow });
      });
    });
  });
});
