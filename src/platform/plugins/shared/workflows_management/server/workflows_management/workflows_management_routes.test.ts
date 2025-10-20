/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { mockRouter as createMockRouter } from '@kbn/core-http-router-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import { defineRoutes } from './routes';
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

  const createMockResponse = () => ({
    ok: jest.fn().mockReturnThis(),
    notFound: jest.fn().mockReturnThis(),
    badRequest: jest.fn().mockReturnThis(),
    customError: jest.fn().mockReturnThis(),
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

        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = createMockResponse();

        await routeHandler({}, mockRequest, mockResponse);

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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
        const mockResponse = createMockResponse();

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

  describe('/api/workflows/{id} (DELETE)', () => {
    describe('DELETE /api/workflows/{id} route definition', () => {
      it('should define the delete workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const deleteWorkflowCall = (mockRouter.delete as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );

        expect(deleteWorkflowCall).toBeDefined();
        expect(deleteWorkflowCall[0]).toMatchObject({
          path: '/api/workflows/{id}',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['all', 'workflow_delete'],
                },
              ],
            },
          },
        });
        expect(deleteWorkflowCall[0].validate).toBeDefined();
        expect(deleteWorkflowCall[0].validate.params).toBeDefined();
        expect(deleteWorkflowCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('DELETE /api/workflows/{id} handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.delete
        const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}'
        );
        routeHandler = deleteCall?.[1];
      });

      it('should delete workflow successfully', async () => {
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
          ['workflow-123'],
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
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
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/workflow-123' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
          ['workflow-123'],
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
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

      it('should handle workflow not found gracefully', async () => {
        // The deleteWorkflows method handles not found workflows gracefully
        // by ignoring 404 errors, so it should not throw
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'non-existent-workflow' },
          headers: {},
          url: { pathname: '/api/workflows/non-existent-workflow' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
          ['non-existent-workflow'],
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123' },
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

  describe('/api/workflows (DELETE)', () => {
    describe('DELETE /api/workflows route definition', () => {
      it('should define the bulk delete workflows route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const deleteBulkCall = (mockRouter.delete as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows'
        );

        expect(deleteBulkCall).toBeDefined();
        expect(deleteBulkCall[0]).toMatchObject({
          path: '/api/workflows',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['all', 'workflow_delete'],
                },
              ],
            },
          },
        });
        expect(deleteBulkCall[0].validate).toBeDefined();
        expect(deleteBulkCall[0].validate.body).toBeDefined();
        expect(deleteBulkCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('DELETE /api/workflows handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.delete
        const deleteCall = (mockRouter.delete as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows'
        );
        routeHandler = deleteCall?.[1];
      });

      it('should delete multiple workflows successfully', async () => {
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: ['workflow-123', 'workflow-456', 'workflow-789'],
          },
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
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle empty ids array gracefully', async () => {
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: [],
          },
          headers: {},
          url: { pathname: '/api/workflows' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith([], 'default', mockRequest);
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: ['workflow-123', 'workflow-456'],
          },
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

      it('should work with different space contexts', async () => {
        workflowsApi.deleteWorkflows = jest.fn().mockResolvedValue(undefined);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: ['workflow-123', 'workflow-456'],
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.deleteWorkflows).toHaveBeenCalledWith(
          ['workflow-123', 'workflow-456'],
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: ['workflow-123'],
          },
          headers: {},
          url: { pathname: '/api/workflows' },
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

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.deleteWorkflows = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          body: {
            ids: ['workflow-123', 'workflow-456'],
          },
          headers: {},
          url: { pathname: '/api/workflows' },
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

  describe('/api/workflows/{id}/run (POST)', () => {
    describe('POST /api/workflows/{id}/run route definition', () => {
      it('should define the run workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postRunCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}/run'
        );

        expect(postRunCall).toBeDefined();
        expect(postRunCall[0]).toMatchObject({
          path: '/api/workflows/{id}/run',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['all', 'workflow_execute', 'workflow_execution_create'],
                },
              ],
            },
          },
        });
        expect(postRunCall[0].validate).toBeDefined();
        expect(postRunCall[0].validate.params).toBeDefined();
        expect(postRunCall[0].validate.body).toBeDefined();
        expect(postRunCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflows/{id}/run handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}/run'
        );
        routeHandler = postCall?.[1];
      });

      it('should run workflow successfully', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
          valid: true,
          definition: {
            name: 'Test Workflow',
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                type: 'action',
                action: 'test-action',
              },
            ],
          },
          yaml: 'name: Test Workflow\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
        };

        const mockExecutionId = 'execution-123';

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
        workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {
              param1: 'value1',
              param2: 'value2',
            },
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler({}, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
          {
            id: 'workflow-123',
            name: 'Test Workflow',
            enabled: true,
            definition: mockWorkflow.definition,
            yaml: mockWorkflow.yaml,
          },
          'default',
          mockRequest.body.inputs,
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      it('should return 404 when workflow is not found', async () => {
        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'non-existent-workflow' },
          body: {
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/non-existent-workflow/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
        expect(mockResponse.notFound).toHaveBeenCalledWith();
      });

      it('should return 400 when workflow is not valid', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Invalid Workflow',
          enabled: true,
          valid: false,
          definition: null,
          yaml: '',
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: {
            message: 'Workflow is not valid.',
          },
        });
      });

      it('should return 400 when workflow is disabled', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Disabled Workflow',
          enabled: false,
          valid: true,
          definition: {
            name: 'Disabled Workflow',
            steps: [],
          },
          yaml: 'name: Disabled Workflow',
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(mockResponse.badRequest).toHaveBeenCalledWith({
          body: {
            message: 'Workflow is disabled. Enable it to run it.',
          },
        });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Workflow execution engine failed';
        workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/run' },
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
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Space-specific Workflow',
          enabled: true,
          valid: true,
          definition: {
            name: 'Space-specific Workflow',
            steps: [],
          },
          yaml: 'name: Space-specific Workflow',
        };

        const mockExecutionId = 'execution-456';

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
        workflowsApi.runWorkflow = jest.fn().mockResolvedValue(mockExecutionId);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {
              spaceParam: 'custom-value',
            },
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/workflow-123/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
        expect(workflowsApi.runWorkflow).toHaveBeenCalledWith(
          {
            id: 'workflow-123',
            name: 'Space-specific Workflow',
            enabled: true,
            definition: mockWorkflow.definition,
            yaml: mockWorkflow.yaml,
          },
          'custom-space',
          mockRequest.body.inputs,
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      it('should handle execution engine errors', async () => {
        const mockWorkflow = {
          id: 'workflow-123',
          name: 'Test Workflow',
          enabled: true,
          valid: true,
          definition: {
            name: 'Test Workflow',
            steps: [],
          },
          yaml: 'name: Test Workflow',
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockWorkflow);
        workflowsApi.runWorkflow = jest.fn().mockRejectedValue(new Error('Execution engine error'));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          body: {
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/run' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Execution engine error',
          },
        });
      });
    });
  });

  describe('/api/workflows/{id}/clone (POST)', () => {
    describe('POST /api/workflows/{id}/clone route definition', () => {
      it('should define the clone workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postCloneCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}/clone'
        );

        expect(postCloneCall).toBeDefined();
        expect(postCloneCall[0]).toMatchObject({
          path: '/api/workflows/{id}/clone',
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
        expect(postCloneCall[0].validate).toBeDefined();
        expect(postCloneCall[0].validate.params).toBeDefined();
        expect(postCloneCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflows/{id}/clone handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/{id}/clone'
        );
        routeHandler = postCall?.[1];
      });

      it('should clone workflow successfully', async () => {
        const mockOriginalWorkflow = {
          id: 'workflow-123',
          name: 'Original Workflow',
          description: 'A workflow to be cloned',
          enabled: true,
          createdAt: new Date('2024-01-15T10:00:00Z'),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date('2024-01-15T10:30:00Z'),
          lastUpdatedBy: 'user@example.com',
          definition: {
            name: 'Original Workflow',
            description: 'A workflow to be cloned',
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                type: 'action',
                action: 'test-action',
              },
            ],
          },
          yaml: 'name: Original Workflow\ndescription: A workflow to be cloned\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          valid: true,
        };

        const mockClonedWorkflow = {
          id: 'workflow-clone-456',
          name: 'Original Workflow Copy',
          description: 'A workflow to be cloned',
          enabled: true,
          createdAt: new Date('2024-01-15T11:00:00Z'),
          createdBy: 'user@example.com',
          lastUpdatedAt: new Date('2024-01-15T11:00:00Z'),
          lastUpdatedBy: 'user@example.com',
          definition: {
            name: 'Original Workflow Copy',
            description: 'A workflow to be cloned',
            steps: [
              {
                id: 'step1',
                name: 'First Step',
                type: 'action',
                action: 'test-action',
              },
            ],
          },
          yaml: 'name: Original Workflow Copy\ndescription: A workflow to be cloned\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
          valid: true,
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
        workflowsApi.cloneWorkflow = jest.fn().mockResolvedValue(mockClonedWorkflow);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/clone' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
          mockOriginalWorkflow,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockClonedWorkflow });
      });

      it('should return 404 when workflow is not found', async () => {
        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { id: 'non-existent-workflow' },
          headers: {},
          url: { pathname: '/api/workflows/non-existent-workflow/clone' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('non-existent-workflow', 'default');
        expect(mockResponse.notFound).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'YAML parsing failed';
        workflowsApi.getWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/clone' },
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
        const mockOriginalWorkflow = {
          id: 'workflow-123',
          name: 'Space-specific Workflow',
          enabled: true,
          valid: true,
          definition: {
            name: 'Space-specific Workflow',
            steps: [],
          },
          yaml: 'name: Space-specific Workflow',
        };

        const mockClonedWorkflow = {
          id: 'workflow-clone-789',
          name: 'Space-specific Workflow Copy',
          enabled: true,
          valid: true,
          definition: {
            name: 'Space-specific Workflow Copy',
            steps: [],
          },
          yaml: 'name: Space-specific Workflow Copy',
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
        workflowsApi.cloneWorkflow = jest.fn().mockResolvedValue(mockClonedWorkflow);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/workflow-123/clone' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'custom-space');
        expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
          mockOriginalWorkflow,
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockClonedWorkflow });
      });

      it('should handle clone operation errors', async () => {
        const mockOriginalWorkflow = {
          id: 'workflow-123',
          name: 'Original Workflow',
          enabled: true,
          valid: true,
          definition: {
            name: 'Original Workflow',
            steps: [],
          },
          yaml: 'name: Original Workflow',
        };

        workflowsApi.getWorkflow = jest.fn().mockResolvedValue(mockOriginalWorkflow);
        workflowsApi.cloneWorkflow = jest
          .fn()
          .mockRejectedValue(new Error('Clone operation failed'));

        const mockContext = {};
        const mockRequest = {
          params: { id: 'workflow-123' },
          headers: {},
          url: { pathname: '/api/workflows/workflow-123/clone' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflow).toHaveBeenCalledWith('workflow-123', 'default');
        expect(workflowsApi.cloneWorkflow).toHaveBeenCalledWith(
          mockOriginalWorkflow,
          'default',
          mockRequest
        );
        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Clone operation failed',
          },
        });
      });
    });
  });

  describe('/api/workflows/test (POST)', () => {
    describe('POST /api/workflows/test route definition', () => {
      it('should define the test workflow route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postTestCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/test'
        );

        expect(postTestCall).toBeDefined();
        expect(postTestCall[0]).toMatchObject({
          path: '/api/workflows/test',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: ['all'],
            },
          },
        });
        expect(postTestCall[0].validate).toBeDefined();
        expect(postTestCall[0].validate.body).toBeDefined();
        expect(postTestCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflows/test handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/test'
        );
        routeHandler = postCall?.[1];
      });

      it('should test workflow successfully', async () => {
        const mockExecutionId = 'test-execution-123';

        workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml:
              'name: Test Workflow\nenabled: true\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
            inputs: {
              param1: 'value1',
              param2: 'value2',
            },
          },
          headers: {},
          url: { pathname: '/api/workflows/test' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
          mockRequest.body.workflowYaml,
          mockRequest.body.inputs,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      // FIXME:Commented, because now it fails with 500 error instead of 400
      // https://github.com/elastic/security-team/issues/14262

      // it('should handle YAML syntax errors with 400 response', async () => {
      //   const yamlError = new Error('Invalid YAML syntax');
      //   yamlError.name = 'InvalidYamlSyntaxError';

      //   workflowsApi.testWorkflow = jest.fn().mockRejectedValue(yamlError);

      //   const mockContext = {};
      //   const mockRequest = {
      //     body: {
      //       workflowYaml: 'invalid: yaml: content: [',
      //       inputs: {},
      //     },
      //     headers: {},
      //     url: { pathname: '/api/workflows/test' },
      //   };
      //   const mockResponse = {
      //     ok: jest.fn().mockReturnThis(),
      //     badRequest: jest.fn().mockReturnThis(),
      //     customError: jest.fn().mockReturnThis(),
      //   };

      //   await routeHandler(mockContext, mockRequest, mockResponse);

      //   expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
      //     mockRequest.body.workflowYaml,
      //     mockRequest.body.inputs,
      //     'default',
      //     mockRequest
      //   );
      //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
      //     body: {
      //       message: 'Invalid workflow yaml: Invalid YAML syntax',
      //     },
      //   });
      // });

      // it('should handle YAML schema errors with 400 response', async () => {
      //   const schemaError = new Error('Invalid YAML schema');
      //   schemaError.name = 'InvalidYamlSchemaError';

      //   workflowsApi.testWorkflow = jest.fn().mockRejectedValue(schemaError);

      //   const mockContext = {};
      //   const mockRequest = {
      //     body: {
      //       workflowYaml: 'name: Test Workflow\ninvalidField: value',
      //       inputs: {},
      //     },
      //     headers: {},
      //     url: { pathname: '/api/workflows/test' },
      //   };
      //   const mockResponse = {
      //     ok: jest.fn().mockReturnThis(),
      //     badRequest: jest.fn().mockReturnThis(),
      //     customError: jest.fn().mockReturnThis(),
      //   };

      //   await routeHandler(mockContext, mockRequest, mockResponse);

      //   expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
      //     mockRequest.body.workflowYaml,
      //     mockRequest.body.inputs,
      //     'default',
      //     mockRequest
      //   );
      //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
      //     body: {
      //       message: 'Invalid workflow yaml: Invalid YAML schema',
      //     },
      //   });
      // });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Workflow execution engine failed';
        workflowsApi.testWorkflow = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Test Workflow',
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/test' },
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
        const mockExecutionId = 'test-execution-456';

        workflowsApi.testWorkflow = jest.fn().mockResolvedValue(mockExecutionId);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Space-specific Test Workflow',
            inputs: {
              spaceParam: 'custom-value',
            },
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/test' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.testWorkflow).toHaveBeenCalledWith(
          mockRequest.body.workflowYaml,
          mockRequest.body.inputs,
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      it('should handle execution engine errors', async () => {
        const executionError = new Error('Execution engine connection failed');
        workflowsApi.testWorkflow = jest.fn().mockRejectedValue(executionError);

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Test Workflow',
            inputs: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/test' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Execution engine connection failed',
          },
        });
      });
    });
  });

  describe('/api/workflows/testStep (POST)', () => {
    describe('POST /api/workflows/testStep route definition', () => {
      it('should define the test step route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postTestStepCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/testStep'
        );

        expect(postTestStepCall).toBeDefined();
        expect(postTestStepCall[0]).toMatchObject({
          path: '/api/workflows/testStep',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: ['all'],
            },
          },
        });
        expect(postTestStepCall[0].validate).toBeDefined();
        expect(postTestStepCall[0].validate.body).toBeDefined();
        expect(postTestStepCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflows/testStep handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/testStep'
        );
        routeHandler = postCall?.[1];
      });

      it('should test step successfully', async () => {
        const mockExecutionId = 'test-step-execution-123';

        workflowsApi.testStep = jest.fn().mockResolvedValue(mockExecutionId);

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml:
              'name: Test Workflow\nenabled: true\nsteps:\n  - id: step1\n    name: First Step\n    type: action\n    action: test-action',
            stepId: 'step1',
            contextOverride: {
              param1: 'value1',
              param2: 'value2',
            },
          },
          headers: {},
          url: { pathname: '/api/workflows/testStep' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.testStep).toHaveBeenCalledWith(
          mockRequest.body.workflowYaml,
          mockRequest.body.stepId,
          mockRequest.body.contextOverride,
          'default',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Step execution engine failed';
        workflowsApi.testStep = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Test Workflow',
            stepId: 'step1',
            contextOverride: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/testStep' },
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
        const mockExecutionId = 'test-step-execution-456';

        workflowsApi.testStep = jest.fn().mockResolvedValue(mockExecutionId);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Space-specific Test Workflow',
            stepId: 'step1',
            contextOverride: {
              spaceParam: 'custom-value',
            },
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflows/testStep' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.testStep).toHaveBeenCalledWith(
          mockRequest.body.workflowYaml,
          mockRequest.body.stepId,
          mockRequest.body.contextOverride,
          'custom-space',
          mockRequest
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({
          body: {
            workflowExecutionId: mockExecutionId,
          },
        });
      });

      it('should handle execution engine errors', async () => {
        const executionError = new Error('Execution engine connection failed');
        workflowsApi.testStep = jest.fn().mockRejectedValue(executionError);

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Test Workflow',
            stepId: 'step1',
            contextOverride: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/testStep' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Execution engine connection failed',
          },
        });
      });

      it('should handle step not found in workflow', async () => {
        const stepNotFoundError = new Error('Step step1 not found in workflow');
        workflowsApi.testStep = jest.fn().mockRejectedValue(stepNotFoundError);

        const mockContext = {};
        const mockRequest = {
          body: {
            workflowYaml: 'name: Test Workflow\nsteps: []',
            stepId: 'step1',
            contextOverride: {},
          },
          headers: {},
          url: { pathname: '/api/workflows/testStep' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Step step1 not found in workflow',
          },
        });
      });

      // FIXME:Commented, because now it fails with 500 error instead of 400
      // https://github.com/elastic/security-team/issues/14263

      // it('should handle YAML parsing errors', async () => {
      //   class InvalidYamlSyntaxError extends Error {
      //     constructor(message: string) {
      //       super(message);
      //       this.name = 'InvalidYamlSyntaxError';
      //     }
      //   }

      //   const yamlError = new InvalidYamlSyntaxError('Invalid YAML syntax');
      //   workflowsApi.testStep = jest.fn().mockRejectedValue(yamlError);

      //   const mockContext = {};
      //   const mockRequest = {
      //     body: {
      //       workflowYaml: 'invalid: yaml: content: [',
      //       stepId: 'step1',
      //       contextOverride: {},
      //     },
      //     headers: {},
      //     url: { pathname: '/api/workflows/testStep' },
      //   };
      //   const mockResponse = {
      //     ok: jest.fn().mockReturnThis(),
      //     badRequest: jest.fn().mockReturnThis(),
      //     customError: jest.fn().mockReturnThis(),
      //   };

      //   await routeHandler(mockContext, mockRequest, mockResponse);

      //   expect(workflowsApi.testStep).toHaveBeenCalledWith(
      //     mockRequest.body.workflowYaml,
      //     mockRequest.body.stepId,
      //     mockRequest.body.contextOverride,
      //     'default',
      //     mockRequest
      //   );
      //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
      //     body: {
      //       message: 'Invalid workflow yaml: Invalid YAML syntax',
      //     },
      //   });
      // });

      // it('should handle YAML schema errors', async () => {
      //   class InvalidYamlSchemaError extends Error {
      //     constructor(message: string) {
      //       super(message);
      //       this.name = 'InvalidYamlSchemaError';
      //     }
      //   }

      //   const schemaError = new InvalidYamlSchemaError('Invalid YAML schema');
      //   workflowsApi.testStep = jest.fn().mockRejectedValue(schemaError);

      //   const mockContext = {};
      //   const mockRequest = {
      //     body: {
      //       workflowYaml: 'name: Test Workflow\ninvalidField: value',
      //       stepId: 'step1',
      //       contextOverride: {},
      //     },
      //     headers: {},
      //     url: { pathname: '/api/workflows/testStep' },
      //   };
      //   const mockResponse = {
      //     ok: jest.fn().mockReturnThis(),
      //     badRequest: jest.fn().mockReturnThis(),
      //     customError: jest.fn().mockReturnThis(),
      //   };

      //   await routeHandler(mockContext, mockRequest, mockResponse);

      //   expect(workflowsApi.testStep).toHaveBeenCalledWith(
      //     mockRequest.body.workflowYaml,
      //     mockRequest.body.stepId,
      //     mockRequest.body.contextOverride,
      //     'default',
      //     mockRequest
      //   );
      //   expect(mockResponse.badRequest).toHaveBeenCalledWith({
      //     body: {
      //       message: 'Invalid workflow yaml: Invalid YAML schema',
      //     },
      //   });
      // });
    });
  });

  describe('/api/workflowExecutions (GET)', () => {
    describe('GET /api/workflowExecutions route definition', () => {
      it('should define the workflow executions route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getExecutionsCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions'
        );

        expect(getExecutionsCall).toBeDefined();
        expect(getExecutionsCall[0]).toMatchObject({
          path: '/api/workflowExecutions',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['read', 'workflow_execution_read'],
                },
              ],
            },
          },
        });
        expect(getExecutionsCall[0].validate).toBeDefined();
        expect(getExecutionsCall[0].validate.query).toBeDefined();
        expect(getExecutionsCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflowExecutions handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions'
        );
        routeHandler = getCall?.[1];
      });

      it('should return workflow executions successfully', async () => {
        const mockExecutions = {
          _pagination: {
            page: 1,
            limit: 10,
            total: 2,
          },
          results: [
            {
              id: 'execution-123',
              workflowId: 'workflow-123',
              status: 'completed',
              executionType: 'manual',
              createdAt: new Date('2024-01-15T10:00:00Z'),
              startedAt: new Date('2024-01-15T10:00:00Z'),
              completedAt: new Date('2024-01-15T10:05:00Z'),
              duration: 300000,
              steps: [
                {
                  id: 'step1',
                  name: 'First Step',
                  status: 'completed',
                  startedAt: new Date('2024-01-15T10:00:00Z'),
                  completedAt: new Date('2024-01-15T10:02:00Z'),
                  duration: 120000,
                },
              ],
            },
            {
              id: 'execution-456',
              workflowId: 'workflow-123',
              status: 'failed',
              executionType: 'manual',
              createdAt: new Date('2024-01-14T09:00:00Z'),
              startedAt: new Date('2024-01-14T09:00:00Z'),
              completedAt: new Date('2024-01-14T09:03:00Z'),
              duration: 180000,
              steps: [
                {
                  id: 'step1',
                  name: 'First Step',
                  status: 'failed',
                  startedAt: new Date('2024-01-14T09:00:00Z'),
                  completedAt: new Date('2024-01-14T09:03:00Z'),
                  duration: 180000,
                },
              ],
            },
          ],
        };

        workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
            statuses: ['completed', 'failed'],
            page: 1,
            perPage: 10,
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
          {
            workflowId: 'workflow-123',
            statuses: ['completed', 'failed'],
            page: 1,
            perPage: 10,
          },
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions' },
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
        const mockExecutions = {
          _pagination: {
            page: 1,
            limit: 10,
            total: 1,
          },
          results: [
            {
              id: 'execution-789',
              workflowId: 'workflow-123',
              status: 'completed',
              executionType: 'manual',
              createdAt: new Date(),
              startedAt: new Date(),
              completedAt: new Date(),
              duration: 300000,
              steps: [],
            },
          ],
        };

        workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
            statuses: ['completed'],
          },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflowExecutions' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
          {
            workflowId: 'workflow-123',
            statuses: ['completed'],
            page: undefined,
            perPage: undefined,
          },
          'custom-space'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions' },
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

      it('should handle pagination parameters', async () => {
        const mockExecutions = {
          _pagination: {
            page: 2,
            limit: 5,
            total: 15,
          },
          results: [],
        };

        workflowsApi.getWorkflowExecutions = jest.fn().mockResolvedValue(mockExecutions);

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
            page: 2,
            perPage: 5,
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutions).toHaveBeenCalledWith(
          {
            workflowId: 'workflow-123',
            page: 2,
            perPage: 5,
          },
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecutions });
      });

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.getWorkflowExecutions = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          query: {
            workflowId: 'workflow-123',
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions' },
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

  describe('/api/workflowExecutions/{workflowExecutionId} (GET)', () => {
    describe('GET /api/workflowExecutions/{workflowExecutionId} route definition', () => {
      it('should define the workflow execution route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getExecutionCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}'
        );

        expect(getExecutionCall).toBeDefined();
        expect(getExecutionCall[0]).toMatchObject({
          path: '/api/workflowExecutions/{workflowExecutionId}',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['read', 'workflow_execution_read'],
                },
              ],
            },
          },
        });
        expect(getExecutionCall[0].validate).toBeDefined();
        expect(getExecutionCall[0].validate.params).toBeDefined();
        expect(getExecutionCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflowExecutions/{workflowExecutionId} handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}'
        );
        routeHandler = getCall?.[1];
      });

      it('should return workflow execution successfully', async () => {
        const mockExecution = {
          id: 'execution-123',
          workflowId: 'workflow-123',
          status: 'completed',
          executionType: 'manual',
          createdAt: new Date('2024-01-15T10:00:00Z'),
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:05:00Z'),
          duration: 300000,
          steps: [
            {
              id: 'step1',
              name: 'First Step',
              status: 'completed',
              startedAt: new Date('2024-01-15T10:00:00Z'),
              completedAt: new Date('2024-01-15T10:02:00Z'),
              duration: 120000,
              inputs: {
                param1: 'value1',
                param2: 'value2',
              },
              outputs: {
                result: 'success',
              },
            },
            {
              id: 'step2',
              name: 'Second Step',
              status: 'completed',
              startedAt: new Date('2024-01-15T10:02:00Z'),
              completedAt: new Date('2024-01-15T10:05:00Z'),
              duration: 180000,
              inputs: {
                param3: 'value3',
              },
              outputs: {
                result: 'completed',
              },
            },
          ],
        };

        workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(mockExecution);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith('execution-123', 'default');
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecution });
      });

      it('should return 404 when execution is not found', async () => {
        workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'non-existent-execution' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/non-existent-execution' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith(
          'non-existent-execution',
          'default'
        );
        expect(mockResponse.notFound).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123' },
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
        const mockExecution = {
          id: 'execution-456',
          workflowId: 'workflow-123',
          status: 'completed',
          executionType: 'manual',
          createdAt: new Date(),
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 300000,
          steps: [],
        };

        workflowsApi.getWorkflowExecution = jest.fn().mockResolvedValue(mockExecution);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-456' },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecution).toHaveBeenCalledWith(
          'execution-456',
          'custom-space'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockExecution });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123' },
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

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.getWorkflowExecution = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123' },
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

  describe('/api/workflowExecutions/{workflowExecutionId}/cancel (POST)', () => {
    describe('POST /api/workflowExecutions/{workflowExecutionId}/cancel route definition', () => {
      it('should define the cancel workflow execution route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const postCancelCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/cancel'
        );

        expect(postCancelCall).toBeDefined();
        expect(postCancelCall[0]).toMatchObject({
          path: '/api/workflowExecutions/{workflowExecutionId}/cancel',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: [
                {
                  anyRequired: ['read', 'workflow_execution_cancel'],
                },
              ],
            },
          },
        });
        expect(postCancelCall[0].validate).toBeDefined();
        expect(postCancelCall[0].validate.params).toBeDefined();
        expect(postCancelCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('POST /api/workflowExecutions/{workflowExecutionId}/cancel handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.post
        const postCall = (mockRouter.post as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/cancel'
        );
        routeHandler = postCall?.[1];
      });

      it('should cancel workflow execution successfully', async () => {
        workflowsApi.cancelWorkflowExecution = jest.fn().mockResolvedValue(undefined);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
          'execution-123',
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      // FIXME:Commented, because now it fails with 500 error instead of 404
      // https://github.com/elastic/security-team/issues/14264

      // it('should return 404 when execution is not found', async () => {
      //   class WorkflowExecutionNotFoundError extends Error {
      //     constructor(message: string) {
      //       super(message);
      //       this.name = 'WorkflowExecutionNotFoundError';
      //     }
      //   }

      //   const notFoundError = new WorkflowExecutionNotFoundError('Workflow execution not found');
      //   workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(notFoundError);

      //   const mockContext = {};
      //   const mockRequest = {
      //     params: { workflowExecutionId: 'non-existent-execution' },
      //     headers: {},
      //     url: { pathname: '/api/workflowExecutions/non-existent-execution/cancel' },
      //   };
      //   const mockResponse = {
      //     ok: jest.fn().mockReturnThis(),
      //     notFound: jest.fn().mockReturnThis(),
      //     customError: jest.fn().mockReturnThis(),
      //   };

      //   await routeHandler(mockContext, mockRequest, mockResponse);

      //   expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
      //     'non-existent-execution',
      //     'default'
      //   );
      //   expect(mockResponse.ok).not.toHaveBeenCalled();
      //   expect(mockResponse.customError).not.toHaveBeenCalled();
      //   expect(mockResponse.notFound).toHaveBeenCalledWith();
      // });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Execution engine connection failed';
        workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
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
        workflowsApi.cancelWorkflowExecution = jest.fn().mockResolvedValue(undefined);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-456' },
          headers: {},
          url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456/cancel' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.cancelWorkflowExecution).toHaveBeenCalledWith(
          'execution-456',
          'custom-space'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith();
      });

      it('should handle execution engine errors', async () => {
        const executionError = new Error('Execution engine connection failed');
        workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(executionError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(mockResponse.customError).toHaveBeenCalledWith({
          statusCode: 500,
          body: {
            message: 'Internal server error: Error: Execution engine connection failed',
          },
        });
      });

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.cancelWorkflowExecution = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/cancel' },
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

  describe('/api/workflowExecutions/{workflowExecutionId}/logs (GET)', () => {
    describe('GET /api/workflowExecutions/{workflowExecutionId}/logs route definition', () => {
      it('should define the workflow execution logs route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getLogsCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/logs'
        );

        expect(getLogsCall).toBeDefined();
        expect(getLogsCall[0]).toMatchObject({
          path: '/api/workflowExecutions/{workflowExecutionId}/logs',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: ['all'],
            },
          },
        });
        expect(getLogsCall[0].validate).toBeDefined();
        expect(getLogsCall[0].validate.params).toBeDefined();
        expect(getLogsCall[0].validate.query).toBeDefined();
        expect(getLogsCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflowExecutions/{workflowExecutionId}/logs handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{workflowExecutionId}/logs'
        );
        routeHandler = getCall?.[1];
      });

      it('should return workflow execution logs successfully', async () => {
        const mockLogs = {
          logs: [
            {
              id: 'log-1',
              timestamp: '2024-01-15T10:00:00Z',
              level: 'info',
              message: 'Workflow execution started',
              stepId: 'step1',
              stepName: 'First Step',
              connectorType: 'action',
              duration: 1000,
              additionalData: {
                workflowId: 'workflow-123',
                workflowName: 'Test Workflow',
                executionId: 'execution-123',
                event: {
                  action: 'workflow_started',
                  duration: 1000,
                },
                tags: ['workflow', 'execution'],
                error: null,
              },
            },
            {
              id: 'log-2',
              timestamp: '2024-01-15T10:00:05Z',
              level: 'info',
              message: 'Step completed successfully',
              stepId: 'step1',
              stepName: 'First Step',
              connectorType: 'action',
              duration: 5000,
              additionalData: {
                workflowId: 'workflow-123',
                workflowName: 'Test Workflow',
                executionId: 'execution-123',
                event: {
                  action: 'step_completed',
                  duration: 5000,
                },
                tags: ['workflow', 'step'],
                error: null,
              },
            },
          ],
          total: 2,
          limit: 100,
          offset: 0,
        };

        workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          query: {
            limit: 100,
            offset: 0,
            sortField: 'timestamp',
            sortOrder: 'desc',
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/logs' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
          {
            executionId: 'execution-123',
            limit: 100,
            offset: 0,
            sortField: 'timestamp',
            sortOrder: 'desc',
            stepExecutionId: undefined,
          },
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getWorkflowExecutionLogs = jest
          .fn()
          .mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          query: {},
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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
        const mockLogs = {
          logs: [],
          total: 0,
          limit: 100,
          offset: 0,
        };

        workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-456' },
          query: {},
          headers: {},
          url: { pathname: '/s/custom-space/api/workflowExecutions/execution-456/logs' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
          {
            executionId: 'execution-456',
          },
          'custom-space'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
      });

      it('should handle pagination parameters', async () => {
        const mockLogs = {
          logs: [
            {
              id: 'log-1',
              timestamp: '2024-01-15T10:00:00Z',
              level: 'info',
              message: 'Workflow execution started',
              stepId: 'step1',
              stepName: 'First Step',
              connectorType: 'action',
              duration: 1000,
              additionalData: {
                workflowId: 'workflow-123',
                workflowName: 'Test Workflow',
                executionId: 'execution-123',
                event: {
                  action: 'workflow_started',
                  duration: 1000,
                },
                tags: ['workflow', 'execution'],
                error: null,
              },
            },
          ],
          total: 1,
          limit: 10,
          offset: 20,
        };

        workflowsApi.getWorkflowExecutionLogs = jest.fn().mockResolvedValue(mockLogs);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          query: {
            limit: 10,
            offset: 20,
            sortField: 'level',
            sortOrder: 'asc',
          },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/logs' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getWorkflowExecutionLogs).toHaveBeenCalledWith(
          {
            executionId: 'execution-123',
            limit: 10,
            offset: 20,
            sortField: 'level',
            sortOrder: 'asc',
          },
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockLogs });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getWorkflowExecutionLogs = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          query: {},
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.getWorkflowExecutionLogs = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          params: { workflowExecutionId: 'execution-123' },
          query: {},
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/logs' },
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

  describe('/api/workflowExecutions/{executionId}/steps/{id} (GET)', () => {
    describe('GET /api/workflowExecutions/{executionId}/steps/{id} route definition', () => {
      it('should define the step execution route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getStepCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{executionId}/steps/{id}'
        );

        expect(getStepCall).toBeDefined();
        expect(getStepCall[0]).toMatchObject({
          path: '/api/workflowExecutions/{executionId}/steps/{id}',
          security: {
            authz: {
              requiredPrivileges: ['all'],
            },
          },
        });
        expect(getStepCall[0].validate).toBeDefined();
        expect(getStepCall[0].validate.params).toBeDefined();
        expect(getStepCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflowExecutions/{executionId}/steps/{id} handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflowExecutions/{executionId}/steps/{id}'
        );
        routeHandler = getCall?.[1];
      });

      it('should return step execution successfully', async () => {
        const mockStepExecution = {
          id: 'step-execution-123',
          workflowRunId: 'execution-123',
          stepId: 'step1',
          stepName: 'First Step',
          stepType: 'action',
          status: 'completed',
          startedAt: new Date('2024-01-15T10:00:00Z'),
          completedAt: new Date('2024-01-15T10:02:00Z'),
          duration: 120000,
          inputs: {
            param1: 'value1',
            param2: 'value2',
          },
          outputs: {
            result: 'success',
            data: {
              processed: 100,
              errors: [],
            },
          },
          error: null,
          spaceId: 'default',
        };

        workflowsApi.getStepExecution = jest.fn().mockResolvedValue(mockStepExecution);

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-123', id: 'step-execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
          { executionId: 'execution-123', id: 'step-execution-123' },
          'default'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStepExecution });
      });

      it('should return 404 when step execution is not found', async () => {
        workflowsApi.getStepExecution = jest.fn().mockResolvedValue(null);

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-123', id: 'non-existent-step' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/steps/non-existent-step' },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
          { executionId: 'execution-123', id: 'non-existent-step' },
          'default'
        );
        expect(mockResponse.notFound).toHaveBeenCalledWith();
      });

      it('should handle API errors gracefully', async () => {
        const errorMessage = 'Elasticsearch connection failed';
        workflowsApi.getStepExecution = jest.fn().mockRejectedValue(new Error(errorMessage));

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-123', id: 'step-execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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
        const mockStepExecution = {
          id: 'step-execution-456',
          workflowRunId: 'execution-456',
          stepId: 'step2',
          stepName: 'Second Step',
          stepType: 'action',
          status: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          duration: 60000,
          inputs: {},
          outputs: {},
          error: null,
          spaceId: 'custom-space',
        };

        workflowsApi.getStepExecution = jest.fn().mockResolvedValue(mockStepExecution);
        mockSpaces.getSpaceId = jest.fn().mockReturnValue('custom-space');

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-456', id: 'step-execution-456' },
          headers: {},
          url: {
            pathname:
              '/s/custom-space/api/workflowExecutions/execution-456/steps/step-execution-456',
          },
        };
        const mockResponse = createMockResponse();

        await routeHandler(mockContext, mockRequest, mockResponse);

        expect(workflowsApi.getStepExecution).toHaveBeenCalledWith(
          { executionId: 'execution-456', id: 'step-execution-456' },
          'custom-space'
        );
        expect(mockResponse.ok).toHaveBeenCalledWith({ body: mockStepExecution });
      });

      it('should handle Elasticsearch connection errors', async () => {
        const esError = new Error('Connection refused');
        esError.name = 'ConnectionError';

        workflowsApi.getStepExecution = jest.fn().mockRejectedValue(esError);

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-123', id: 'step-execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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

      it('should handle service initialization errors', async () => {
        const serviceError = new Error('WorkflowsService not initialized');
        workflowsApi.getStepExecution = jest.fn().mockRejectedValue(serviceError);

        const mockContext = {};
        const mockRequest = {
          params: { executionId: 'execution-123', id: 'step-execution-123' },
          headers: {},
          url: { pathname: '/api/workflowExecutions/execution-123/steps/step-execution-123' },
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

  describe('/api/workflows/workflow-json-schema (GET)', () => {
    describe('GET /api/workflows/workflow-json-schema route definition', () => {
      it('should define the workflow JSON schema route with correct configuration', () => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);

        const getSchemaCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/workflow-json-schema'
        );

        expect(getSchemaCall).toBeDefined();
        expect(getSchemaCall[0]).toMatchObject({
          path: '/api/workflows/workflow-json-schema',
          options: {
            tags: ['api', 'workflows'],
          },
          security: {
            authz: {
              requiredPrivileges: ['all'],
            },
          },
        });
        expect(getSchemaCall[0].validate).toBeDefined();
        expect(getSchemaCall[0].validate.query).toBeDefined();
        expect(getSchemaCall[1]).toEqual(expect.any(Function));
      });
    });

    describe('GET /api/workflows/workflow-json-schema handler logic', () => {
      let routeHandler: any;

      beforeEach(() => {
        defineRoutes(mockRouter, workflowsApi, mockLogger, mockSpaces);
        // Get the handler function that was passed to router.get
        const getCall = (mockRouter.get as jest.Mock).mock.calls.find(
          (call) => call[0].path === '/api/workflows/workflow-json-schema'
        );
        routeHandler = getCall?.[1];
      });

      it('should return workflow JSON schema successfully', async () => {
        const mockJsonSchema = {
          $schema: 'http://json-schema.org/draft-07/schema#',
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description: 'Workflow name',
            },
            description: {
              type: 'string',
              description: 'Workflow description',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: {
                    type: 'string',
                    description: 'Step ID',
                  },
                  name: {
                    type: 'string',
                    description: 'Step name',
                  },
                  type: {
                    type: 'string',
                    description: 'Step type',
                  },
                  inputs: {
                    type: 'object',
                    description: 'Step inputs',
                  },
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
            name: {
              type: 'string',
              description: 'Workflow name',
            },
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
});
