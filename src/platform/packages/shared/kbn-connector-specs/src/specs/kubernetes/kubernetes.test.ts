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
import { KubernetesConnector } from './kubernetes';

const API_URL = 'https://my-cluster.example.com:6443';

interface TestResult {
  message?: string;
}

describe('KubernetesConnector', () => {
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
      expect(KubernetesConnector.metadata.id).toBe('.kubernetes');
      expect(KubernetesConnector.metadata.displayName).toBe('Kubernetes');
    });

    it('supports agentBuilder features', () => {
      expect(KubernetesConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(KubernetesConnector.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('recommends the bearer_with_tls auth type', () => {
      const k8sAuth = KubernetesConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer_with_tls'
      );
      expect(k8sAuth).toBeDefined();
      expect(k8sAuth?.isRecommended).toBe(true);
    });

    it('validates secrets with a required token', () => {
      const schema = generateSecretsSchemaFromSpec(KubernetesConnector.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(schema.safeParse({ authType: 'bearer_with_tls', token: 'sa-token' }).success).toBe(
        true
      );
      expect(schema.safeParse({ authType: 'bearer_with_tls', token: '' }).success).toBe(false);
    });

    it('offers managed cluster auth types for GKE, EKS, and AKS', () => {
      const types = KubernetesConnector.auth?.types.map((t) =>
        typeof t === 'object' ? t.type : t
      );
      expect(types).toEqual([
        'bearer_with_tls',
        'kubernetes_gke',
        'kubernetes_eks',
        'kubernetes_aks',
      ]);
    });

    it('validates managed cluster secrets', () => {
      const schema = generateSecretsSchemaFromSpec(KubernetesConnector.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(
        schema.safeParse({ authType: 'kubernetes_gke', serviceAccountJson: '{"type":"sa"}' })
          .success
      ).toBe(true);
      expect(schema.safeParse({ authType: 'kubernetes_gke', serviceAccountJson: '' }).success).toBe(
        false
      );

      expect(
        schema.safeParse({
          authType: 'kubernetes_eks',
          accessKeyId: 'AKIA123',
          secretAccessKey: 'secret',
          region: 'us-east-1',
          clusterName: 'my-cluster',
        }).success
      ).toBe(true);
      expect(schema.safeParse({ authType: 'kubernetes_eks', accessKeyId: 'AKIA123' }).success).toBe(
        false
      );

      expect(
        schema.safeParse({
          authType: 'kubernetes_aks',
          tenantId: 'tenant',
          clientId: 'client',
          clientSecret: 'secret',
        }).success
      ).toBe(true);
      expect(
        schema.safeParse({ authType: 'kubernetes_aks', tenantId: 'tenant', clientId: 'client' })
          .success
      ).toBe(false);
    });
  });

  describe('request action (generic)', () => {
    it('issues a request to the given path with query and body', async () => {
      mockRequest.mockResolvedValue(okResponse({ kind: 'PodList' }));

      const result = await KubernetesConnector.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/api/v1/namespaces/default/pods',
        query: { labelSelector: 'app=nginx' },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `${API_URL}/api/v1/namespaces/default/pods`,
        params: { labelSelector: 'app=nginx' },
      });
      expect(result).toEqual({ kind: 'PodList' });
    });

    it('defaults the Content-Type for PATCH to strategic merge patch', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      await KubernetesConnector.actions.request.handler(mockContext, {
        method: 'PATCH',
        path: '/apis/apps/v1/namespaces/default/deployments/web',
        body: { spec: { replicas: 2 } },
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          data: { spec: { replicas: 2 } },
          headers: { 'Content-Type': 'application/strategic-merge-patch+json' },
        })
      );
    });

    it('honors an explicit contentType override', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      await KubernetesConnector.actions.request.handler(mockContext, {
        method: 'PATCH',
        path: '/api/v1/namespaces/default/configmaps/cm',
        body: [{ op: 'add', path: '/data/x', value: '1' }],
        contentType: 'application/json-patch+json',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json-patch+json' },
        })
      );
    });
  });

  describe('path building', () => {
    it('uses /api for the core group and /apis for named groups', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      await KubernetesConnector.actions.listResources.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        namespace: 'default',
        limit: 100,
      });
      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ url: `${API_URL}/api/v1/namespaces/default/pods` })
      );

      await KubernetesConnector.actions.listResources.handler(mockContext, {
        apiVersion: 'apps/v1',
        resource: 'deployments',
        namespace: 'default',
        limit: 100,
      });
      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          url: `${API_URL}/apis/apps/v1/namespaces/default/deployments`,
        })
      );
    });

    it('omits the namespace segment when none is given', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      await KubernetesConnector.actions.listResources.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'nodes',
        limit: 100,
      });

      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({ url: `${API_URL}/api/v1/nodes` })
      );
    });

    it('percent-encodes path segments that need escaping', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      await KubernetesConnector.actions.getResource.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        namespace: 'team a',
        name: 'pod/with/slash',
      });

      expect(mockRequest).toHaveBeenLastCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/namespaces/team%20a/pods/pod%2Fwith%2Fslash`,
        })
      );
    });
  });

  describe('listResources', () => {
    it('slims the list response and forwards selectors', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          apiVersion: 'v1',
          kind: 'PodList',
          metadata: { continue: 'next-token' },
          items: [
            {
              metadata: {
                name: 'pod-a',
                namespace: 'default',
                labels: { app: 'nginx' },
                creationTimestamp: '2024-01-01T00:00:00Z',
                managedFields: [{ manager: 'kubelet' }],
              },
              status: { phase: 'Running', extra: 'dropped' },
            },
          ],
        })
      );

      const result = (await KubernetesConnector.actions.listResources.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        namespace: 'default',
        labelSelector: 'app=nginx',
        fieldSelector: 'status.phase=Running',
        limit: 50,
      })) as {
        itemCount: number;
        continue?: string;
        items: Array<{ name?: string; status?: Record<string, unknown> }>;
      };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            limit: '50',
            labelSelector: 'app=nginx',
            fieldSelector: 'status.phase=Running',
          },
        })
      );
      expect(result.itemCount).toBe(1);
      expect(result.continue).toBe('next-token');
      expect(result.items[0]).toEqual({
        name: 'pod-a',
        namespace: 'default',
        labels: { app: 'nginx' },
        creationTimestamp: '2024-01-01T00:00:00Z',
        status: { phase: 'Running' },
      });
    });

    it('forwards the continue token for pagination', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      await KubernetesConnector.actions.listResources.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        limit: 100,
        continue: 'next-token',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          params: {
            limit: '100',
            continue: 'next-token',
          },
        })
      );
    });
  });

  describe('listEvents', () => {
    it('forwards selectors, limit, and continue and returns a continue token', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          kind: 'EventList',
          metadata: { continue: 'events-next' },
          items: [
            {
              type: 'Warning',
              reason: 'FailedScheduling',
              message: '0/1 nodes available',
              involvedObject: { kind: 'Pod', name: 'pod-a' },
              count: 3,
              lastTimestamp: '2024-01-01T00:00:00Z',
            },
          ],
        })
      );

      const result = (await KubernetesConnector.actions.listEvents.handler(mockContext, {
        namespace: 'default',
        labelSelector: 'app=nginx',
        fieldSelector: 'type=Warning',
        limit: 25,
        continue: 'prev-token',
      })) as {
        itemCount: number;
        continue?: string;
        items: Array<{ type?: string; reason?: string }>;
      };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/namespaces/default/events`,
          params: {
            limit: '25',
            labelSelector: 'app=nginx',
            fieldSelector: 'type=Warning',
            continue: 'prev-token',
          },
        })
      );
      expect(result.itemCount).toBe(1);
      expect(result.continue).toBe('events-next');
      expect(result.items[0]).toEqual({
        type: 'Warning',
        reason: 'FailedScheduling',
        message: '0/1 nodes available',
        involvedObject: { kind: 'Pod', name: 'pod-a' },
        count: 3,
        lastTimestamp: '2024-01-01T00:00:00Z',
      });
    });
  });

  describe('getResource', () => {
    it('strips managedFields from the returned object', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          kind: 'Pod',
          metadata: { name: 'pod-a', managedFields: [{ manager: 'kubelet' }] },
        })
      );

      const result = (await KubernetesConnector.actions.getResource.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        namespace: 'default',
        name: 'pod-a',
      })) as { metadata: Record<string, unknown> };

      expect(result.metadata).toEqual({ name: 'pod-a' });
    });
  });

  describe('createResource', () => {
    it('POSTs the manifest and applies dryRun', async () => {
      mockRequest.mockResolvedValue(okResponse({ kind: 'ConfigMap' }));

      await KubernetesConnector.actions.createResource.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'configmaps',
        namespace: 'default',
        manifest: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'cm' } },
        dryRun: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${API_URL}/api/v1/namespaces/default/configmaps`,
          params: { dryRun: 'All' },
          data: { apiVersion: 'v1', kind: 'ConfigMap', metadata: { name: 'cm' } },
        })
      );
    });
  });

  describe('applyResource', () => {
    it('uses server-side apply with a field manager and apply-patch content type', async () => {
      mockRequest.mockResolvedValue(okResponse({ kind: 'Deployment' }));

      await KubernetesConnector.actions.applyResource.handler(mockContext, {
        apiVersion: 'apps/v1',
        resource: 'deployments',
        namespace: 'default',
        name: 'web',
        manifest: { apiVersion: 'apps/v1', kind: 'Deployment', metadata: { name: 'web' } },
        fieldManager: 'kibana',
        force: true,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: `${API_URL}/apis/apps/v1/namespaces/default/deployments/web`,
          params: { fieldManager: 'kibana', force: 'true' },
          headers: { 'Content-Type': 'application/apply-patch+json' },
        })
      );
    });
  });

  describe('patchResource', () => {
    it('maps the patch strategy to the correct content type', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      await KubernetesConnector.actions.patchResource.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'configmaps',
        namespace: 'default',
        name: 'cm',
        patch: [{ op: 'replace', path: '/data/key', value: 'v' }],
        patchType: 'json',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json-patch+json' },
          data: [{ op: 'replace', path: '/data/key', value: 'v' }],
        })
      );
    });
  });

  describe('deleteResource', () => {
    it('DELETEs the resource by name', async () => {
      mockRequest.mockResolvedValue(okResponse({ status: 'Success' }));

      await KubernetesConnector.actions.deleteResource.handler(mockContext, {
        apiVersion: 'v1',
        resource: 'pods',
        namespace: 'default',
        name: 'pod-a',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'DELETE',
          url: `${API_URL}/api/v1/namespaces/default/pods/pod-a`,
          params: {},
        })
      );
    });
  });

  describe('scaleWorkload', () => {
    it('PATCHes the scale subresource with the desired replicas', async () => {
      mockRequest.mockResolvedValue(okResponse({ kind: 'Scale' }));

      await KubernetesConnector.actions.scaleWorkload.handler(mockContext, {
        resource: 'deployments',
        namespace: 'default',
        name: 'web',
        replicas: 3,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: `${API_URL}/apis/apps/v1/namespaces/default/deployments/web/scale`,
          data: { spec: { replicas: 3 } },
          headers: { 'Content-Type': 'application/merge-patch+json' },
        })
      );
    });
  });

  describe('getPodLogs', () => {
    it('returns untruncated logs when small', async () => {
      mockRequest.mockResolvedValue(okResponse('line 1\nline 2\n'));

      const result = (await KubernetesConnector.actions.getPodLogs.handler(mockContext, {
        namespace: 'default',
        name: 'pod-a',
        tailLines: 200,
      })) as { logs: string; truncated: boolean };

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v1/namespaces/default/pods/pod-a/log`,
          params: { tailLines: '200' },
        })
      );
      expect(result).toEqual({ logs: 'line 1\nline 2\n', truncated: false });
    });

    it('truncates oversized logs to the tail', async () => {
      const big = 'x'.repeat(25000);
      mockRequest.mockResolvedValue(okResponse(big));

      const result = (await KubernetesConnector.actions.getPodLogs.handler(mockContext, {
        namespace: 'default',
        name: 'pod-a',
        tailLines: 200,
      })) as { logs: string; truncated: boolean };

      expect(result.truncated).toBe(true);
      expect(result.logs).toHaveLength(20000);
    });
  });

  describe('security guardrails', () => {
    describe('blocked subresources', () => {
      it.each(['exec', 'portforward', 'attach', 'proxy'])(
        'rejects the %s subresource via request',
        async (sub) => {
          await expect(
            KubernetesConnector.actions.request.handler(mockContext, {
              method: 'POST',
              path: `/api/v1/namespaces/default/pods/pod-a/${sub}`,
            })
          ).rejects.toThrow(`"${sub}" subresource`);
          expect(mockRequest).not.toHaveBeenCalled();
        }
      );

      it.each(['exec', 'portforward', 'attach', 'proxy'])(
        'rejects the %s subresource when a query string is embedded in path',
        async (sub) => {
          await expect(
            KubernetesConnector.actions.request.handler(mockContext, {
              method: 'POST',
              path: `/api/v1/namespaces/default/pods/pod-a/${sub}?command=/bin/sh&stdin=true`,
            })
          ).rejects.toThrow(`"${sub}" subresource`);
          expect(mockRequest).not.toHaveBeenCalled();
        }
      );

      it('rejects blocked subresources when a fragment is embedded in path', async () => {
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '/api/v1/namespaces/default/pods/pod-a/exec#fragment',
          })
        ).rejects.toThrow('"exec" subresource');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('rejects paths that do not start with a slash (SSRF host-repoint)', async () => {
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '@evil.example.com/api/v1/namespaces',
          })
        ).rejects.toThrow('must start with "/"');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('rejects paths outside the Kubernetes API prefixes', async () => {
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '/metrics',
          })
        ).rejects.toThrow('must be under /api, /apis, /version');
        expect(mockRequest).not.toHaveBeenCalled();
      });

      it('allows ordinary paths through', async () => {
        mockRequest.mockResolvedValue(okResponse({ kind: 'PodList', items: [] }));
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '/api/v1/namespaces/default/pods',
          })
        ).resolves.toBeDefined();
      });

      it('allows /version and health endpoints', async () => {
        mockRequest.mockResolvedValue(okResponse({ major: '1' }));
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '/version',
          })
        ).resolves.toBeDefined();

        mockRequest.mockResolvedValue(okResponse('ok'));
        await expect(
          KubernetesConnector.actions.request.handler(mockContext, {
            method: 'GET',
            path: '/readyz',
          })
        ).resolves.toBeDefined();
      });
    });

    describe('secret data scrubbing', () => {
      it('strips data and stringData from a Secret response', async () => {
        mockRequest.mockResolvedValue(
          okResponse({
            kind: 'Secret',
            metadata: { name: 'my-secret', namespace: 'default' },
            type: 'Opaque',
            data: { username: 'dXNlcg==', password: 'cGFzc3dvcmQ=' },
            stringData: { token: 'raw-token' },
          })
        );

        const result = (await KubernetesConnector.actions.getResource.handler(mockContext, {
          apiVersion: 'v1',
          resource: 'secrets',
          namespace: 'default',
          name: 'my-secret',
        })) as Record<string, unknown>;

        expect(result.data).toBeUndefined();
        expect(result.stringData).toBeUndefined();
        expect((result.metadata as Record<string, unknown>)?.name).toBe('my-secret');
      });

      it('strips data from SecretList items that omit kind (real K8s list shape)', async () => {
        mockRequest.mockResolvedValue(
          okResponse({
            kind: 'SecretList',
            apiVersion: 'v1',
            items: [
              // Kubernetes omits kind/apiVersion on list items — only the
              // envelope carries kind: "SecretList".
              {
                metadata: { name: 'sa', namespace: 'default' },
                data: { token: 'abc123' },
                stringData: { raw: 'leaked' },
              },
            ],
          })
        );

        const result = (await KubernetesConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/api/v1/namespaces/default/secrets',
        })) as { kind: string; items: Array<Record<string, unknown>> };

        expect(result.kind).toBe('SecretList');
        expect(result.items[0].data).toBeUndefined();
        expect(result.items[0].stringData).toBeUndefined();
        expect(result.items[0].metadata).toBeDefined();
      });

      it('does not alter non-secret responses', async () => {
        mockRequest.mockResolvedValue(
          okResponse({
            kind: 'ConfigMap',
            metadata: { name: 'cm' },
            data: { key: 'value' },
          })
        );

        const result = (await KubernetesConnector.actions.getResource.handler(mockContext, {
          apiVersion: 'v1',
          resource: 'configmaps',
          namespace: 'default',
          name: 'cm',
        })) as Record<string, unknown>;

        expect(result.data).toEqual({ key: 'value' });
      });
    });
  });

  describe('error normalization', () => {
    it('surfaces the Kubernetes Status message on failure', async () => {
      mockRequest.mockRejectedValue({
        response: {
          status: 403,
          data: {
            kind: 'Status',
            code: 403,
            reason: 'Forbidden',
            message: 'pods is forbidden: User cannot list resource "pods"',
          },
        },
      });

      await expect(
        KubernetesConnector.actions.listResources.handler(mockContext, {
          apiVersion: 'v1',
          resource: 'pods',
          namespace: 'default',
          limit: 100,
        })
      ).rejects.toThrow(
        'Kubernetes API error (403) [Forbidden]: pods is forbidden: User cannot list resource "pods"'
      );
    });
  });

  describe('test handler', () => {
    const runTestHandler = async (): Promise<TestResult> => {
      const connectorTest = KubernetesConnector.test;
      if (!connectorTest) {
        throw new Error('KubernetesConnector is missing a test handler');
      }
      return (await connectorTest.handler(mockContext)) as TestResult;
    };

    it('reports success with the cluster version', async () => {
      mockRequest.mockResolvedValue(okResponse({ gitVersion: 'v1.29.0' }));

      const result = await runTestHandler();

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${API_URL}/version` })
      );
      expect(result.message).toContain('v1.29.0');
    });

    it('throws with the normalized error message on failure', async () => {
      mockRequest.mockRejectedValue({
        response: { data: { message: 'Unauthorized', code: 401 } },
      });

      await expect(runTestHandler()).rejects.toThrow('Unauthorized');
    });
  });
});
