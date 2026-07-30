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
import { AnsibleControllerConnector } from './ansible_controller';

const API_URL = 'https://controller.example.com';

interface TestResult {
  message?: string;
}

describe('AnsibleControllerConnector', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { apiUrl: API_URL, apiBasePath: '/api/v2' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const okResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(AnsibleControllerConnector.metadata.id).toBe('.ansible_controller');
      expect(AnsibleControllerConnector.metadata.displayName).toBe('Ansible Control Server');
    });

    it('is technical preview for agentBuilder', () => {
      expect(AnsibleControllerConnector.metadata.isTechnicalPreview).toBe(true);
      expect(AnsibleControllerConnector.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });
  });

  describe('auth', () => {
    it('recommends bearer_with_tls auth', () => {
      const auth = AnsibleControllerConnector.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer_with_tls'
      );
      expect(auth?.isRecommended).toBe(true);
    });

    it('requires a token', () => {
      const schema = generateSecretsSchemaFromSpec(AnsibleControllerConnector.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });
      expect(schema.safeParse({ authType: 'bearer_with_tls', token: 'pat-token' }).success).toBe(
        true
      );
      expect(schema.safeParse({ authType: 'bearer_with_tls', token: '' }).success).toBe(false);
    });
  });

  describe('URL building', () => {
    it('prefixes typed paths with apiBasePath', async () => {
      mockRequest.mockResolvedValue(okResponse({ count: 0, results: [] }));
      await AnsibleControllerConnector.actions.listJobTemplates.handler(mockContext, {
        page: 1,
        pageSize: 25,
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_URL}/api/v2/job_templates/`,
        })
      );
    });

    it('strips trailing slash from apiUrl', async () => {
      mockRequest.mockResolvedValue(okResponse({ results: [] }));
      const ctx = {
        ...mockContext,
        config: { apiUrl: `${API_URL}/`, apiBasePath: '/api/v2' },
      } as unknown as ActionContext;
      await AnsibleControllerConnector.actions.getMe.handler(ctx, {});
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${API_URL}/api/v2/me/` })
      );
    });

    it('allows absolute /api/ paths on request without double-prefixing', async () => {
      mockRequest.mockResolvedValue(okResponse({}));
      await AnsibleControllerConnector.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/api/gateway/v1/me/',
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${API_URL}/api/gateway/v1/me/` })
      );
    });
  });

  describe('guards', () => {
    it('rejects paths without leading slash', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: 'job_templates/',
        })
      ).rejects.toThrow('must start with "/"');
    });

    it('rejects websocket paths', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/websocket/',
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects credential mutations via request', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'POST',
          path: '/api/v2/credentials/',
          body: { name: 'x' },
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects password reset / privilege escalation via PATCH on the user object itself', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'PATCH',
          path: '/users/5/',
          body: { password: 'new-password' },
        })
      ).rejects.toThrow('not permitted');

      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'PATCH',
          path: '/users/5/',
          body: { is_superuser: true },
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects user creation via relative path', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'POST',
          path: '/users/',
          body: { username: 'evil', is_superuser: true },
        })
      ).rejects.toThrow('not permitted');
    });

    it('rejects mutations to relative-path prefixes that resolve to blocked absolute paths', async () => {
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'POST',
          path: '/tokens/',
          body: {},
        })
      ).rejects.toThrow('not permitted');

      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/tokens/',
        })
      ).rejects.toThrow('not permitted');
    });

    it('still allows reading (GET) the users collection', async () => {
      mockRequest.mockResolvedValue(okResponse({ count: 0, results: [] }));
      await expect(
        AnsibleControllerConnector.actions.request.handler(mockContext, {
          method: 'GET',
          path: '/users/',
        })
      ).resolves.toEqual({ count: 0, results: [] });
    });
  });

  describe('listJobTemplates', () => {
    it('returns slim template summaries', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          count: 1,
          results: [
            {
              id: 7,
              name: 'remediate-web',
              description: 'x'.repeat(600),
              playbook: 'remediate.yml',
              ask_inventory_on_launch: true,
              summary_fields: {
                inventory: { id: 1, name: 'prod' },
                project: { id: 2, name: 'ops' },
                organization: { id: 3, name: 'Default' },
              },
              related: { huge: 'map' },
            },
          ],
        })
      );
      const result = await AnsibleControllerConnector.actions.listJobTemplates.handler(
        mockContext,
        { page: 1, pageSize: 25, search: 'remediate' }
      );
      expect(result).toEqual({
        count: 1,
        next: null,
        previous: null,
        results: [
          expect.objectContaining({
            id: 7,
            name: 'remediate-web',
            playbook: 'remediate.yml',
            ask_inventory_on_launch: true,
            inventory: { id: 1, name: 'prod' },
            project: { id: 2, name: 'ops' },
            organization: { id: 3, name: 'Default' },
          }),
        ],
      });
      expect(
        (result as { results: Array<{ description?: string }> }).results[0].description
      ).toHaveLength(501);
      expect((result as { results: Array<Record<string, unknown>> }).results[0]).not.toHaveProperty(
        'related'
      );
    });
  });

  describe('launchJobTemplate', () => {
    it('posts launch body with extra_vars and rejects oversized extraVars', async () => {
      mockRequest.mockResolvedValue(okResponse({ id: 99, status: 'pending' }));
      await AnsibleControllerConnector.actions.launchJobTemplate.handler(mockContext, {
        id: 7,
        extraVars: { service: 'nginx' },
        limit: 'web',
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${API_URL}/api/v2/job_templates/7/launch/`,
          data: expect.objectContaining({
            extra_vars: { service: 'nginx' },
            limit: 'web',
          }),
        })
      );

      await expect(
        AnsibleControllerConnector.actions.launchJobTemplate.handler(mockContext, {
          id: 7,
          extraVars: { blob: 'x'.repeat(70000) },
        })
      ).rejects.toThrow('extraVars JSON exceeds');
    });
  });

  describe('getJobStdout', () => {
    it('truncates oversized stdout from the tail', async () => {
      const big = 'y'.repeat(25000);
      mockRequest.mockResolvedValue(okResponse(big));
      const result = await AnsibleControllerConnector.actions.getJobStdout.handler(mockContext, {
        id: 42,
        format: 'txt',
      });
      expect(result).toEqual({
        jobId: 42,
        content: big.slice(big.length - 20000),
        truncated: true,
      });
    });
  });

  describe('listCredentials scrubbing via request', () => {
    it('scrubs credential inputs from responses', async () => {
      mockRequest.mockResolvedValue(
        okResponse({
          id: 1,
          name: 'ssh',
          inputs: { password: 'secret', username: 'root' },
        })
      );
      const result = (await AnsibleControllerConnector.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/credentials/1/',
      })) as Record<string, unknown>;
      expect(result).toEqual({ id: 1, name: 'ssh' });
      expect(result).not.toHaveProperty('inputs');
    });
  });

  describe('test handler', () => {
    it('reports the authenticated username', async () => {
      mockRequest.mockResolvedValue(okResponse({ results: [{ username: 'automation' }] }));
      const result = (await AnsibleControllerConnector.test?.handler(mockContext)) as TestResult;
      expect(result.message).toBe('Successfully connected to Ansible Control Server as automation');
    });
  });

  describe('error normalization', () => {
    it('surfaces detail and status', async () => {
      mockRequest.mockRejectedValue({
        response: { status: 403, data: { detail: 'You do not have permission' } },
      });
      await expect(
        AnsibleControllerConnector.actions.getJob.handler(mockContext, { id: 1 })
      ).rejects.toThrow('Ansible Controller API error (403): You do not have permission');
    });
  });
});
