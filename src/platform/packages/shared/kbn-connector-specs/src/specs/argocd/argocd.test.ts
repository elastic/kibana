/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext, AuthTypeDef } from '../../connector_spec';
import { generateSecretsSchemaFromSpec } from '../../lib/generate_secrets_schema_from_spec';
import { ArgocdConnector } from './argocd';

const API_URL = 'https://argocd.example.com';

interface TestResult {
  message?: string;
}

describe('ArgocdConnector', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { apiUrl: API_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const okResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(ArgocdConnector.metadata.id).toBe('.argocd');
      expect(ArgocdConnector.metadata.displayName).toBe('Argo CD');
    });

    it('supports agentBuilder features', () => {
      expect(ArgocdConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(ArgocdConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('recommends the bearer_with_tls auth type', () => {
      const auth = ArgocdConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer_with_tls'
      );
      expect(auth).toBeDefined();
      expect(auth?.isRecommended).toBe(true);
    });

    it('validates secrets with a required token', () => {
      const schema = generateSecretsSchemaFromSpec(ArgocdConnector.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(schema.safeParse({ authType: 'bearer_with_tls', token: 'argo-token' }).success).toBe(
        true
      );
      expect(schema.safeParse({ authType: 'bearer_with_tls', token: '' }).success).toBe(false);
    });
  });

  describe('request action', () => {
    it('issues a request to the given path with query and body', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      const result = await ArgocdConnector.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/api/v1/applications',
        query: { project: 'default' },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `${API_URL}/api/v1/applications`,
        params: { project: 'default' },
      });
      expect(result).toEqual({ items: [] });
    });

    it('strips a trailing slash from apiUrl', async () => {
      mockRequest.mockResolvedValue(okResponse({}));
      const ctx = {
        ...mockContext,
        config: { apiUrl: `${API_URL}/` },
      } as unknown as ActionContext;

      await ArgocdConnector.actions.request.handler(ctx, {
        method: 'GET',
        path: '/api/v1/session/userinfo',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${API_URL}/api/v1/session/userinfo` })
      );
    });

    it('rejects paths that do not start with /', async () => {
      await expect(
        ArgocdConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: 'api/v1/applications',
        })
      ).rejects.toThrow('must start with "/"');
    });

    it('rejects streaming endpoints', async () => {
      await expect(
        ArgocdConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/api/v1/stream/applications',
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects mutating cluster credential paths', async () => {
      await expect(
        ArgocdConnector.actions.request.handler(mockContext, {
          method: 'POST',
          path: '/api/v1/clusters',
          body: { server: 'https://evil' },
        })
      ).rejects.toThrow('not permitted');
    });
  });

  describe('listApplications', () => {
    it('returns slim application summaries', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          items: [
            {
              metadata: { name: 'demo', namespace: 'argocd', labels: { team: 'platform' } },
              spec: {
                project: 'default',
                source: {
                  repoURL: 'https://github.com/example/repo',
                  path: 'manifests',
                  targetRevision: 'main',
                },
                destination: { server: 'https://kubernetes.default.svc', namespace: 'demo' },
              },
              status: {
                sync: { status: 'Synced' },
                health: { status: 'Healthy' },
                operationState: { phase: 'Succeeded', message: 'ok' },
                resources: [{ kind: 'Deployment', name: 'web' }],
              },
            },
          ],
        })
      );

      const result = await ArgocdConnector.actions.listApplications.handler(mockContext, {
        project: 'default',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/applications`,
          params: { project: 'default' },
        })
      );
      expect(result).toEqual({
        itemCount: 1,
        items: [
          {
            metadata: { name: 'demo', namespace: 'argocd', labels: { team: 'platform' } },
            spec: {
              project: 'default',
              sources: [
                {
                  repoURL: 'https://github.com/example/repo',
                  path: 'manifests',
                  targetRevision: 'main',
                },
              ],
              destination: {
                server: 'https://kubernetes.default.svc',
                name: undefined,
                namespace: 'demo',
              },
            },
            status: {
              sync: 'Synced',
              health: 'Healthy',
              operationState: { phase: 'Succeeded', message: 'ok' },
            },
          },
        ],
      });
      expect(
        (result as { items: Array<{ status: Record<string, unknown> }> }).items[0].status
      ).not.toHaveProperty('resources');
    });
  });

  describe('getApplication', () => {
    it('caps history and strips oversized syncResult.resources', async () => {
      const history = Array.from({ length: 15 }, (_, i) => ({ id: i, revision: `r${i}` }));
      mockRequest.mockResolvedValue(
        okResponse({
          metadata: { name: 'demo' },
          spec: { project: 'default' },
          status: {
            sync: { status: 'OutOfSync' },
            health: { status: 'Degraded' },
            history,
            operationState: {
              phase: 'Failed',
              message: 'boom',
              syncResult: { resources: [{ name: 'a' }, { name: 'b' }] },
            },
          },
        })
      );

      const result = (await ArgocdConnector.actions.getApplication.handler(mockContext, {
        name: 'demo',
        project: 'default',
        refresh: 'hard',
      })) as {
        status: {
          history: unknown[];
          historyTruncated: boolean;
          operationState: { syncResult: { resources: { count: number; truncated: boolean } } };
        };
      };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/applications/demo`,
          params: { project: 'default', refresh: 'hard' },
        })
      );
      expect(result.status.history).toHaveLength(10);
      expect(result.status.historyTruncated).toBe(true);
      expect(result.status.operationState.syncResult.resources).toEqual({
        count: 2,
        truncated: true,
      });
    });
  });

  describe('syncApplication', () => {
    it('defaults prune to false', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      await ArgocdConnector.actions.syncApplication.handler(mockContext, {
        name: 'demo',
        dryRun: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${API_URL}/api/v1/applications/demo/sync`,
          data: expect.objectContaining({ prune: false, dryRun: true }),
        })
      );
    });
  });

  describe('listClusters', () => {
    it('scrubs credential fields from cluster config', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          items: [
            {
              name: 'in-cluster',
              server: 'https://kubernetes.default.svc',
              config: {
                bearerToken: 'secret-token',
                tlsClientConfig: { keyData: 'abc' },
                awsAuthConfig: { roleARN: 'arn' },
              },
            },
          ],
        })
      );

      const result = (await ArgocdConnector.actions.listClusters.handler(mockContext, {})) as {
        items: Array<{ config: Record<string, unknown> }>;
      };

      expect(result.items[0].config).toEqual({});
      expect(result.items[0].config).not.toHaveProperty('bearerToken');
    });
  });

  describe('getPodLogs', () => {
    it('truncates oversized log output', async () => {
      const big = 'x'.repeat(25000);
      mockRequest.mockResolvedValue(okResponse(big));

      const result = await ArgocdConnector.actions.getPodLogs.handler(mockContext, {
        name: 'demo',
        podName: 'web-abc',
        namespace: 'demo',
        tailLines: 200,
      });

      expect(result).toEqual({
        logs: big.slice(big.length - 20000),
        truncated: true,
      });
    });
  });

  describe('getProject', () => {
    it('defaults to the detailed endpoint', async () => {
      mockRequest.mockResolvedValue(okResponse({ metadata: { name: 'default' } }));

      await ArgocdConnector.actions.getProject.handler(mockContext, { name: 'default' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/projects/default/detailed`,
        })
      );
    });
  });

  describe('error normalization', () => {
    it('surfaces Argo CD message and HTTP status', async () => {
      mockRequest.mockRejectedValue({
        response: { status: 403, data: { message: 'permission denied', code: 7 } },
      });

      await expect(
        ArgocdConnector.actions.getApplication.handler(mockContext, { name: 'demo' })
      ).rejects.toThrow('Argo CD API error (7): permission denied');
    });
  });

  describe('test handler', () => {
    it('reports the connected username', async () => {
      mockRequest.mockResolvedValue(okResponse({ loggedIn: true, username: 'admin' }));

      const result = (await ArgocdConnector.test?.handler(mockContext)) as TestResult;
      expect(result.message).toBe('Successfully connected to Argo CD as admin');
    });
  });
});
