/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { registerGetConnectorsRoute } from './get_connectors';
import {
  createMockResponse,
  createMockRouterInstance,
  createMockWorkflowsApi,
  createSpacesMock,
  mockLogger,
} from './test_utils';
import type { WorkflowsManagementApi } from '../workflows_management_api';

jest.mock('../lib/with_license_check');

describe('GET /api/workflows/connectors', () => {
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
      registerGetConnectorsRoute({
        router: mockRouter,
        api: workflowsApi,
        logger: mockLogger,
        spaces: mockSpaces,
      });
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

      expect(workflowsApi.getAvailableConnectors).toHaveBeenCalledWith('custom-space', mockRequest);
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
