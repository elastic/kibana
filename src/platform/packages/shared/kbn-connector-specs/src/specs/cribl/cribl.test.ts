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
import { Cribl } from './cribl';
import {
  UpdateSourceInputSchema,
  UpdateDestinationInputSchema,
  UpdatePipelineInputSchema,
} from './types';

const SERVER_URL = 'https://leader.example.com:9000';

interface TestResult {
  message?: string;
}

describe('Cribl', () => {
  const mockRequest = jest.fn();
  const mockClient = { request: mockRequest };

  const mockContext = {
    client: mockClient,
    config: { serverUrl: SERVER_URL },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  const okResponse = (data: unknown) => ({ data });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('has the expected id and display name', () => {
      expect(Cribl.metadata.id).toBe('.cribl');
      expect(Cribl.metadata.displayName).toBe('Cribl');
    });

    it('supports only agentBuilder for now', () => {
      expect(Cribl.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(Cribl.metadata.isTechnicalPreview).toBe(true);
    });
  });

  describe('auth', () => {
    it('recommends the bearer_with_tls auth type', () => {
      const auth = Cribl.auth?.types.find(
        (t): t is AuthTypeDef => typeof t === 'object' && t.type === 'bearer_with_tls'
      );
      expect(auth).toBeDefined();
      expect(auth?.isRecommended).toBe(true);
    });

    it('validates secrets with a required token', () => {
      const schema = generateSecretsSchemaFromSpec(Cribl.auth, {
        isPfxEnabled: false,
        isEarsEnabled: false,
        isEarsExperimentalEnabled: false,
      });

      expect(schema.safeParse({ authType: 'bearer_with_tls', token: 'cribl-token' }).success).toBe(
        true
      );
      expect(schema.safeParse({ authType: 'bearer_with_tls', token: '' }).success).toBe(false);
    });
  });

  describe('request action', () => {
    it('issues a request to the given path with query and body', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [] }));

      const result = await Cribl.actions.request.handler(mockContext, {
        method: 'GET',
        path: '/master/groups',
        query: { product: 'stream' },
      });

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: `${SERVER_URL}/api/v1/master/groups`,
        params: { product: 'stream' },
      });
      expect(result).toEqual({ items: [] });
    });

    it('strips a trailing slash from serverUrl', async () => {
      mockRequest.mockResolvedValue(okResponse({}));
      const ctx = {
        ...mockContext,
        config: { serverUrl: `${SERVER_URL}/` },
      } as unknown as ActionContext;

      await Cribl.actions.request.handler(ctx, { method: 'GET', path: '/health' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${SERVER_URL}/api/v1/health` })
      );
    });

    it('rejects paths that do not start with /', async () => {
      await expect(
        Cribl.actions.request.handler(mockContext, { method: 'GET', path: 'master/groups' })
      ).rejects.toThrow('must start with "/"');
    });

    it('rejects credential management endpoints', async () => {
      await expect(
        Cribl.actions.request.handler(mockContext, { method: 'GET', path: '/api-credentials' })
      ).rejects.toThrow('not permitted');
    });

    it('rejects the local user/RBAC endpoints', async () => {
      await expect(
        Cribl.actions.request.handler(mockContext, { method: 'GET', path: '/system/users' })
      ).rejects.toThrow('not permitted');
    });
  });

  describe('listWorkerGroups', () => {
    it('lists groups with the leader-context URL', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ items: [{ id: 'default', workerCount: 3 }], count: 1 })
      );

      const result = await Cribl.actions.listWorkerGroups.handler(mockContext, {
        product: 'stream',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/master/groups`,
          params: { product: 'stream' },
        })
      );
      expect(result).toEqual({ count: 1, items: [{ id: 'default', workerCount: 3 }] });
    });
  });

  describe('listRoutes', () => {
    it('reads the routing table scoped to a group and unwraps the items envelope', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ items: [{ id: 'default', routes: [{ id: 'r1' }] }], count: 1 })
      );

      const result = await Cribl.actions.listRoutes.handler(mockContext, {
        groupName: 'myGroup',
        routeId: 'default',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/m/myGroup/routes/default`,
        })
      );
      expect(result).toEqual({ id: 'default', routes: [{ id: 'r1' }] });
    });
  });

  describe('updateRoutes', () => {
    it('sends the complete routes array as a full replace and unwraps the items envelope', async () => {
      const routes = [
        { id: 'r1', filter: 'true', pipeline: 'main', output: 'default', final: false },
      ];
      mockRequest.mockResolvedValue(okResponse({ items: [{ id: 'default', routes }], count: 1 }));

      const result = await Cribl.actions.updateRoutes.handler(mockContext, {
        groupName: 'myGroup',
        routeId: 'default',
        routes,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/m/myGroup/routes/default`,
          data: { id: 'default', routes },
        })
      );
      expect(result).toEqual({ id: 'default', routes });
    });
  });

  describe('commitConfig', () => {
    it('commits pending changes for a specific group', async () => {
      mockRequest.mockResolvedValue(okResponse({ commit: 'abcd1234' }));

      const result = await Cribl.actions.commitConfig.handler(mockContext, {
        message: 'reroute noisy source',
        group: 'myGroup',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${SERVER_URL}/api/v1/version/commit`,
          data: { message: 'reroute noisy source', group: 'myGroup' },
        })
      );
      expect(result).toEqual({ commit: 'abcd1234' });
    });

    it('omits group when syncing the Leader', async () => {
      mockRequest.mockResolvedValue(okResponse({ commit: 'efgh5678' }));

      await Cribl.actions.commitConfig.handler(mockContext, { message: 'sync leader' });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ data: { message: 'sync leader' } })
      );
    });
  });

  describe('deployGroup', () => {
    it('deploys the given commit version to the group', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      await Cribl.actions.deployGroup.handler(mockContext, {
        groupName: 'myGroup',
        version: 'abcd1234',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/master/groups/myGroup/deploy`,
          data: { version: 'abcd1234' },
        })
      );
    });
  });

  describe('getPipeline', () => {
    it('unwraps the single-item Cribl response envelope', async () => {
      mockRequest.mockResolvedValue(
        okResponse({ items: [{ id: 'main', conf: { functions: [] } }], count: 1 })
      );

      const result = await Cribl.actions.getPipeline.handler(mockContext, {
        groupName: 'myGroup',
        pipelineId: 'main',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/m/myGroup/pipelines/main`,
        })
      );
      expect(result).toEqual({ id: 'main', conf: { functions: [] } });
    });
  });

  describe('updateSource', () => {
    it('fetches the current Source and PATCHes the merged complete object', async () => {
      mockRequest
        .mockResolvedValueOnce(
          okResponse({
            items: [
              {
                id: 'in_splunk_hec',
                type: 'splunk_hec',
                host: '0.0.0.0',
                port: 8088,
                status: { health: 'Green' },
                notifications: [],
              },
            ],
            count: 1,
          })
        )
        .mockResolvedValueOnce(okResponse({}));

      await Cribl.actions.updateSource.handler(mockContext, {
        groupName: 'myGroup',
        sourceId: 'in_splunk_hec',
        disabled: true,
        conf: { port: 9088 },
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/inputs/in_splunk_hec`,
        })
      );
      // The PATCH body carries every field from the GET (minus status/notifications), not just
      // the changed ones — Cribl's control-plane PATCH requires the complete resource.
      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/inputs/in_splunk_hec`,
          data: {
            id: 'in_splunk_hec',
            type: 'splunk_hec',
            host: '0.0.0.0',
            disabled: true,
            port: 9088,
          },
        })
      );
    });
  });

  describe('updateDestination', () => {
    it('fetches the current Destination and PATCHes the merged complete object', async () => {
      mockRequest
        .mockResolvedValueOnce(
          okResponse({
            items: [
              { id: 'out_s3', type: 's3', bucket: 'my-bucket', status: {}, notifications: [] },
            ],
            count: 1,
          })
        )
        .mockResolvedValueOnce(okResponse({}));

      await Cribl.actions.updateDestination.handler(mockContext, {
        groupName: 'myGroup',
        destinationId: 'out_s3',
        disabled: true,
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/outputs/out_s3`,
          data: { id: 'out_s3', type: 's3', bucket: 'my-bucket', disabled: true },
        })
      );
    });
  });

  describe('updatePipeline', () => {
    it('fetches the current pipeline and merges conf without dropping existing conf fields', async () => {
      mockRequest
        .mockResolvedValueOnce(
          okResponse({
            items: [{ id: 'main', conf: { functions: [{ id: 'eval' }] }, otherField: 'keep-me' }],
            count: 1,
          })
        )
        .mockResolvedValueOnce(okResponse({}));

      await Cribl.actions.updatePipeline.handler(mockContext, {
        groupName: 'myGroup',
        pipelineId: 'main',
        conf: { output: 'devnull' },
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/m/myGroup/pipelines/main`,
          data: {
            id: 'main',
            otherField: 'keep-me',
            conf: { functions: [{ id: 'eval' }], output: 'devnull' },
          },
        })
      );
    });
  });

  describe('restartWorkerGroup', () => {
    it('posts to the group system settings restart endpoint', async () => {
      mockRequest.mockResolvedValue(okResponse({}));

      const result = await Cribl.actions.restartWorkerGroup.handler(mockContext, {
        groupName: 'myGroup',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/settings/restart`,
        })
      );
      expect(result).toEqual({ message: 'Restart requested for Worker Group "myGroup"' });
    });
  });

  describe('runSearch', () => {
    it('submits a search job in the default_search context and trims the bulky job payload', async () => {
      // The real Cribl response also includes a compiled query plan, access policies, and dataset
      // catalog that can run into tens of KB — none of it useful to a workflow.
      mockRequest.mockResolvedValue(
        okResponse({
          items: [
            {
              id: 'job-1',
              status: 'queued',
              query: 'cribl dataset="ds" | limit 1000',
              earliest: '-1h',
              latest: 'now',
              group: 'default_search',
              timeCreated: 1700000000000,
              internal: { compiledPolicies: [{ object: '*', actions: ['*'] }] },
              stages: [{ id: 'root', searchConfig: { pipelines: {} } }],
            },
          ],
          count: 1,
        })
      );

      const result = await Cribl.actions.runSearch.handler(mockContext, {
        query: 'cribl dataset="ds" | limit 1000',
        earliest: '-1h',
        latest: 'now',
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: `${SERVER_URL}/api/v1/m/default_search/search/jobs`,
          data: { query: 'cribl dataset="ds" | limit 1000', earliest: '-1h', latest: 'now' },
        })
      );
      expect(result).toEqual({
        id: 'job-1',
        status: 'queued',
        query: 'cribl dataset="ds" | limit 1000',
        earliest: '-1h',
        latest: 'now',
        group: 'default_search',
        timeCreated: 1700000000000,
      });
    });
  });

  describe('getSearchResults', () => {
    it('parses newline-delimited JSON into records', async () => {
      mockRequest.mockResolvedValue(okResponse('{"a":1}\n{"a":2}\n\n{"a":3}'));

      const result = await Cribl.actions.getSearchResults.handler(mockContext, {
        jobId: 'job-1',
        limit: 100,
        offset: 0,
      });

      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/m/default_search/search/jobs/job-1/results`,
          params: { limit: '100', offset: '0' },
          headers: { Accept: 'application/x-ndjson' },
          responseType: 'text',
        })
      );
      expect(result).toEqual({ records: [{ a: 1 }, { a: 2 }, { a: 3 }], truncated: false });
    });

    it('truncates results that exceed the character cap', async () => {
      const bigRecords = Array.from({ length: 5 }, (_, i) =>
        JSON.stringify({ i, pad: 'x'.repeat(20000) })
      );
      mockRequest.mockResolvedValue(okResponse(bigRecords.join('\n')));

      const result = (await Cribl.actions.getSearchResults.handler(mockContext, {
        jobId: 'job-1',
      })) as { records: unknown[]; truncated: boolean };

      expect(result.truncated).toBe(true);
      expect(result.records.length).toBeLessThan(5);
    });
  });

  describe('updateLookup', () => {
    it('uploads content, then POSTs to create a brand-new lookup when none exists yet', async () => {
      mockRequest
        .mockResolvedValueOnce(okResponse({ filename: 'tmp-upload-123.csv' }))
        .mockResolvedValueOnce(okResponse({ items: [], count: 0 })) // no existing metadata yet
        .mockResolvedValueOnce(okResponse({ id: 'blocklist.csv' }));

      const result = await Cribl.actions.updateLookup.handler(mockContext, {
        groupName: 'myGroup',
        lookupId: 'blocklist.csv',
        content: 'ip,reason\n1.2.3.4,malware',
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          method: 'PUT',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/lookups`,
          params: { filename: 'blocklist.csv' },
          data: 'ip,reason\n1.2.3.4,malware',
          headers: { 'Content-Type': 'text/csv' },
        })
      );
      expect(mockRequest).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          method: 'GET',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/lookups/blocklist.csv`,
        })
      );
      // Cribl requires POST (not PATCH) to register a lookup id that doesn't exist yet.
      expect(mockRequest).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          method: 'POST',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/lookups`,
          data: { id: 'blocklist.csv', fileInfo: { filename: 'tmp-upload-123.csv' } },
        })
      );
      expect(result).toEqual({ id: 'blocklist.csv' });
    });

    it('PATCHes the existing lookup id when it already exists', async () => {
      mockRequest
        .mockResolvedValueOnce(okResponse({ filename: 'tmp-upload-456.csv' }))
        .mockResolvedValueOnce(okResponse({ items: [{ id: 'blocklist.csv' }], count: 1 }))
        .mockResolvedValueOnce(okResponse({ id: 'blocklist.csv' }));

      await Cribl.actions.updateLookup.handler(mockContext, {
        groupName: 'myGroup',
        lookupId: 'blocklist.csv',
        content: 'ip,reason\n5.6.7.8,phishing',
      });

      expect(mockRequest).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          method: 'PATCH',
          url: `${SERVER_URL}/api/v1/m/myGroup/system/lookups/blocklist.csv`,
          data: { id: 'blocklist.csv', fileInfo: { filename: 'tmp-upload-456.csv' } },
        })
      );
    });
  });

  describe('input validation', () => {
    it('rejects updateSource with neither disabled nor conf set', () => {
      const result = UpdateSourceInputSchema.safeParse({
        groupName: 'myGroup',
        sourceId: 'in_splunk_hec',
      });
      expect(result.success).toBe(false);
    });

    it('rejects updateDestination with neither disabled nor conf set', () => {
      const result = UpdateDestinationInputSchema.safeParse({
        groupName: 'myGroup',
        destinationId: 'out_s3',
      });
      expect(result.success).toBe(false);
    });

    it('rejects updatePipeline without conf (pipelines have no top-level disabled flag)', () => {
      const result = UpdatePipelineInputSchema.safeParse({
        groupName: 'myGroup',
        pipelineId: 'main',
      });
      expect(result.success).toBe(false);
    });

    it('accepts updatePipeline with conf set', () => {
      const result = UpdatePipelineInputSchema.safeParse({
        groupName: 'myGroup',
        pipelineId: 'main',
        conf: { output: 'devnull' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts updateSource with only disabled set', () => {
      const result = UpdateSourceInputSchema.safeParse({
        groupName: 'myGroup',
        sourceId: 'in_splunk_hec',
        disabled: true,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('error normalization', () => {
    it('surfaces the Cribl message and HTTP status', async () => {
      mockRequest.mockRejectedValue({
        response: { status: 401, data: { message: 'invalid or expired token' } },
      });

      await expect(Cribl.actions.listWorkerGroups.handler(mockContext, {})).rejects.toThrow(
        'Cribl API error (401): invalid or expired token'
      );
    });
  });

  describe('test handler', () => {
    it('reports success after listing worker groups', async () => {
      mockRequest.mockResolvedValue(okResponse({ items: [], count: 0 }));

      const result = (await Cribl.test?.handler(mockContext)) as TestResult;
      expect(result.message).toBe('Successfully connected to Cribl');
      expect(mockRequest).toHaveBeenCalledWith(
        expect.objectContaining({ url: `${SERVER_URL}/api/v1/master/groups` })
      );
    });
  });
});
