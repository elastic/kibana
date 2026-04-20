/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GcpCloudFunctionsConnector } from './gcp_cloud_functions';

jest.mock('../../auth_types/gcp_jwt_helpers', () => {
  const actual = jest.requireActual('../../auth_types/gcp_jwt_helpers');
  return {
    ...actual,
    getGcpIdToken: jest.fn().mockResolvedValue('mock-id-token'),
  };
});

describe('GcpCloudFunctionsConnector', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
  };

  const SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: 'service_account',
    project_id: 'my-gcp-project',
    private_key_id: 'key-123',
    private_key: '-----BEGIN PRIVATE KEY-----\nfake-key\n-----END PRIVATE KEY-----\n',
    client_email: 'test@my-gcp-project.iam.gserviceaccount.com',
    client_id: '123',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
  });

  const mockContext = {
    client: mockClient,
    config: {
      projectId: 'my-gcp-project',
      region: 'europe-west1',
    },
    secrets: {
      serviceAccountJson: SERVICE_ACCOUNT_JSON,
    },
    log: {},
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct id, display name, and auth type', () => {
      expect(GcpCloudFunctionsConnector.metadata.id).toBe('.gcp_cloud_functions');
      expect(GcpCloudFunctionsConnector.metadata.displayName).toBe('GCP Cloud Functions');
      expect(GcpCloudFunctionsConnector.metadata.supportedFeatureIds).toContain('workflows');
      expect(GcpCloudFunctionsConnector.metadata.supportedFeatureIds).toContain('agentBuilder');
      expect(GcpCloudFunctionsConnector.auth?.types).toEqual(['gcp_service_account']);
    });
  });

  describe('schema', () => {
    it('should require projectId and region in config', () => {
      const schema = GcpCloudFunctionsConnector.schema;
      expect(schema).toBeDefined();
      if (schema) {
        expect(Object.keys(schema.shape)).toEqual(['projectId', 'region']);
      }
    });
  });

  describe('invoke action', () => {
    it('should resolve service URL and invoke with an ID token', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: {
          name: 'projects/my-gcp-project/locations/europe-west1/services/my-function',
          uri: 'https://my-function-abc123-ew.a.run.app',
        },
      });

      mockClient.post.mockResolvedValue({
        status: 200,
        data: { result: 'hello world' },
        headers: {},
      });

      const result = await GcpCloudFunctionsConnector.actions.invoke.handler(mockContext, {
        functionName: 'my-function',
        payload: { key: 'value' },
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining(
          'run.googleapis.com/v2/projects/my-gcp-project/locations/europe-west1/services/my-function'
        ),
        expect.any(Object)
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://my-function-abc123-ew.a.run.app',
        expect.stringContaining('"key":"value"'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-id-token',
          }),
        })
      );

      expect(result).toEqual(
        expect.objectContaining({
          statusCode: 200,
          functionName: 'my-function',
          payload: { result: 'hello world' },
        })
      );
    });

    it('should send empty JSON body when no payload is provided', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: { uri: 'https://fn-abc.a.run.app' },
      });

      mockClient.post.mockResolvedValue({
        status: 200,
        data: { ok: true },
        headers: {},
      });

      await GcpCloudFunctionsConnector.actions.invoke.handler(mockContext, {
        functionName: 'no-payload-fn',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        'https://fn-abc.a.run.app',
        '{}',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mock-id-token',
          }),
        })
      );
    });

    it('should throw when service has no URI', async () => {
      mockClient.get.mockResolvedValue({
        status: 200,
        data: {
          name: 'projects/my-gcp-project/locations/europe-west1/services/broken-svc',
        },
      });

      await expect(
        GcpCloudFunctionsConnector.actions.invoke.handler(mockContext, {
          functionName: 'broken-svc',
        })
      ).rejects.toThrow('does not have an HTTP URL');
    });
  });

  describe('listFunctions action', () => {
    it('should list Cloud Run services', async () => {
      const mockResponse = {
        data: {
          services: [
            {
              name: 'projects/my-gcp-project/locations/europe-west1/services/function-one',
              description: 'First function',
              uri: 'https://function-one-abc-ew.a.run.app',
              updateTime: '2025-01-01T00:00:00Z',
              createTime: '2024-12-01T00:00:00Z',
              ingress: 'INGRESS_TRAFFIC_ALL',
              template: {
                containers: [{ image: 'europe-west1-docker.pkg.dev/my-project/repo/fn:latest' }],
                scaling: { minInstanceCount: 0, maxInstanceCount: 100 },
              },
            },
            {
              name: 'projects/my-gcp-project/locations/europe-west1/services/function-two',
              description: 'Second function',
              uri: 'https://function-two-def-ew.a.run.app',
              updateTime: '2025-02-01T00:00:00Z',
              createTime: '2025-01-01T00:00:00Z',
              ingress: 'INGRESS_TRAFFIC_INTERNAL_ONLY',
              template: {
                containers: [{ image: 'europe-west1-docker.pkg.dev/my-project/repo/fn2:latest' }],
                scaling: { minInstanceCount: 1, maxInstanceCount: 10 },
              },
            },
          ],
          nextPageToken: null,
        },
      };
      mockClient.get.mockResolvedValue(mockResponse);

      const result = (await GcpCloudFunctionsConnector.actions.listFunctions.handler(
        mockContext,
        {}
      )) as {
        functions: Array<{ functionName: string; uri: string }>;
        nextPageToken: string | null;
      };

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining(
          'run.googleapis.com/v2/projects/my-gcp-project/locations/europe-west1/services'
        ),
        expect.any(Object)
      );

      expect(result.functions).toHaveLength(2);
      expect(result.functions[0].functionName).toBe('function-one');
      expect(result.functions[0].uri).toBe('https://function-one-abc-ew.a.run.app');
      expect(result.functions[1].functionName).toBe('function-two');
      expect(result.nextPageToken).toBeNull();
    });

    it('should pass pageSize and pageToken query params', async () => {
      mockClient.get.mockResolvedValue({
        data: { services: [], nextPageToken: null },
      });

      await GcpCloudFunctionsConnector.actions.listFunctions.handler(mockContext, {
        pageSize: 5,
        pageToken: 'token123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            pageSize: '5',
            pageToken: 'token123',
          }),
        })
      );
    });

    it('should handle pagination with nextPageToken', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          services: [
            {
              name: 'projects/my-gcp-project/locations/europe-west1/services/fn-a',
              uri: 'https://fn-a.a.run.app',
              template: {
                containers: [{ image: 'gcr.io/my-project/fn-a:latest' }],
                scaling: {},
              },
            },
          ],
          nextPageToken: 'next-page-token',
        },
      });

      const result = (await GcpCloudFunctionsConnector.actions.listFunctions.handler(mockContext, {
        pageSize: 1,
      })) as { nextPageToken: string | null };

      expect(result.nextPageToken).toBe('next-page-token');
    });
  });

  describe('getFunction action', () => {
    it('should get service details', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: 'projects/my-gcp-project/locations/europe-west1/services/my-function',
          description: 'A test function',
          uri: 'https://my-function-abc-ew.a.run.app',
          updateTime: '2025-01-15T10:00:00Z',
          createTime: '2024-12-01T00:00:00Z',
          labels: { env: 'production' },
          ingress: 'INGRESS_TRAFFIC_ALL',
          launchStage: 'GA',
          template: {
            containers: [{ image: 'europe-west1-docker.pkg.dev/my-project/repo/fn:v1' }],
            serviceAccount: 'sa@my-gcp-project.iam.gserviceaccount.com',
            timeout: '300s',
            scaling: { minInstanceCount: 0, maxInstanceCount: 100 },
          },
        },
      });

      const result = (await GcpCloudFunctionsConnector.actions.getFunction.handler(mockContext, {
        functionName: 'my-function',
      })) as Record<string, unknown>;

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining(
          '/v2/projects/my-gcp-project/locations/europe-west1/services/my-function'
        ),
        expect.any(Object)
      );

      expect(result).toEqual({
        functionName: 'my-function',
        fullName: 'projects/my-gcp-project/locations/europe-west1/services/my-function',
        description: 'A test function',
        uri: 'https://my-function-abc-ew.a.run.app',
        updateTime: '2025-01-15T10:00:00Z',
        createTime: '2024-12-01T00:00:00Z',
        labels: { env: 'production' },
        ingress: 'INGRESS_TRAFFIC_ALL',
        launchStage: 'GA',
        image: 'europe-west1-docker.pkg.dev/my-project/repo/fn:v1',
        serviceAccountEmail: 'sa@my-gcp-project.iam.gserviceaccount.com',
        timeout: '300s',
        maxInstanceCount: 100,
        minInstanceCount: 0,
      });
    });
  });

  describe('error handling', () => {
    it('should handle authentication errors (401)', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 401, statusText: 'Unauthorized', data: {} },
      });

      await expect(
        GcpCloudFunctionsConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('Authentication failed (401)');
    });

    it('should handle authorization errors (403) and include raw body', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: 'Your client does not have permission',
        },
      });

      await expect(
        GcpCloudFunctionsConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('Access denied (403) — Your client does not have permission');
    });

    it('should handle GCP JSON error responses', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { error: { code: 404, status: 'NOT_FOUND', message: 'Service not found' } },
        },
      });

      await expect(
        GcpCloudFunctionsConnector.actions.getFunction.handler(mockContext, {
          functionName: 'missing',
        })
      ).rejects.toThrow('GCP API error [NOT_FOUND]: Service not found');
    });

    it('should handle generic network errors', async () => {
      mockClient.get.mockRejectedValue(new Error('Network timeout'));

      await expect(
        GcpCloudFunctionsConnector.actions.listFunctions.handler(mockContext, {})
      ).rejects.toThrow('GCP API request failed: Network timeout');
    });
  });

  describe('test handler', () => {
    it('should return success when API is accessible', async () => {
      mockClient.get.mockResolvedValue({ data: { services: [] } });

      if (!GcpCloudFunctionsConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GcpCloudFunctionsConnector.test.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/v2/projects/my-gcp-project/locations/europe-west1/services'),
        expect.any(Object)
      );
      expect(result).toEqual({
        ok: true,
        message: 'Successfully connected to GCP Cloud Run API',
      });
    });

    it('should return failure when API is not accessible', async () => {
      mockClient.get.mockRejectedValue(new Error('Invalid credentials'));

      if (!GcpCloudFunctionsConnector.test) {
        throw new Error('Test handler not defined');
      }
      const result = await GcpCloudFunctionsConnector.test.handler(mockContext);

      expect(result.ok).toBe(false);
      expect(result.message).toContain('Failed to connect');
    });
  });
});
