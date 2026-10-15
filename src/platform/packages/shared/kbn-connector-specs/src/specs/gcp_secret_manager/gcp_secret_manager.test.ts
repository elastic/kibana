/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GcpSecretManager } from './gcp_secret_manager';

const API = 'https://secretmanager.googleapis.com/v1';
const PROJECT = 'my-project-123';
const SECRET = 'my-api-key';
const SECRET_BASE = `${API}/projects/${PROJECT}/secrets/${SECRET}`;

/** The literal value used to check payload handling. Never a real credential. */
const SECRET_VALUE = 'super-secret-value';
const SECRET_VALUE_B64 = Buffer.from(SECRET_VALUE, 'utf8').toString('base64');

describe('GcpSecretManager', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };
  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  const getAction = (name: string) => {
    const action = GcpSecretManager.actions[name];
    if (!action) {
      throw new Error(`Action ${name} is not defined on the spec`);
    }
    return action;
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('uses the official product name', () => {
      expect(GcpSecretManager.metadata.displayName).toBe('Google Cloud Secret Manager');
    });

    it('uses the dotted connector id', () => {
      expect(GcpSecretManager.metadata.id).toBe('.gcp_secret_manager');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(GcpSecretManager.metadata.supportedFeatureIds).toEqual(['workflows', 'agentBuilder']);
    });

    it('is marked as technical preview', () => {
      expect(GcpSecretManager.metadata.isTechnicalPreview).toBe(true);
    });

    it('authenticates with a GCP service account', () => {
      expect(GcpSecretManager.auth?.types).toEqual(['gcp_service_account']);
    });

    it('has a skill covering the rotation sequence and the payload warning', () => {
      expect(GcpSecretManager.skill).toContain('addSecretVersion');
      expect(GcpSecretManager.skill).toContain('disableSecretVersion');
      expect(GcpSecretManager.skill).toContain('revealPayload');
    });

    it('enables the connector test handler', () => {
      expect(GcpSecretManager.test?.enabled).toBe(true);
    });
  });

  describe('isTool split', () => {
    // Metadata reads are safe for an agent. Anything that writes, destroys, or can surface
    // credential material is workflow-only.
    const readOnlyTools = [
      'listSecrets',
      'getSecret',
      'listSecretVersions',
      'getSecretVersion',
      'getSecretIamPolicy',
    ];
    const restrictedActions = [
      'accessSecretVersion',
      'addSecretVersion',
      'disableSecretVersion',
      'enableSecretVersion',
      'destroySecretVersion',
      'createSecret',
      'updateSecret',
      'deleteSecret',
      'setSecretIamPolicy',
    ];

    it.each(readOnlyTools)('exposes %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(true);
    });

    it.each(restrictedActions)('does not expose %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(false);
    });

    it('never exposes the payload-bearing read to an agent', () => {
      // The single most important line in this file: an Agent Builder agent must not be able to
      // read a secret value autonomously.
      expect(getAction('accessSecretVersion').isTool).toBe(false);
    });

    it('covers every action in exactly one of the two lists', () => {
      expect(Object.keys(GcpSecretManager.actions).sort()).toEqual(
        [...readOnlyTools, ...restrictedActions].sort()
      );
    });

    it('gives every action a plain-string description', () => {
      for (const [name, action] of Object.entries(GcpSecretManager.actions)) {
        expect(typeof action.description).toBe('string');
        expect((action.description as string).length).toBeGreaterThan(0);
        expect(name).not.toHaveLength(0);
      }
    });
  });

  describe('listSecrets', () => {
    it('requests the project collection and passes filter and pagination through', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          secrets: [
            {
              name: `projects/111111111111/secrets/${SECRET}`,
              createTime: '2026-01-01T00:00:00Z',
              replication: { automatic: {} },
              labels: { env: 'prod' },
              etag: '"abc"',
            },
          ],
          nextPageToken: 'next',
          totalSize: 70,
        },
      });

      const result = await getAction('listSecrets').handler(mockContext, {
        projectId: PROJECT,
        filter: 'name:api',
        pageSize: 10,
        pageToken: 'prev',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/secrets`,
        expect.objectContaining({
          params: { filter: 'name:api', pageSize: 10, pageToken: 'prev' },
        })
      );
      expect(result).toEqual({
        secrets: [
          {
            name: `projects/111111111111/secrets/${SECRET}`,
            secretId: SECRET,
            createTime: '2026-01-01T00:00:00Z',
            labels: { env: 'prod' },
            annotations: {},
            versionAliases: {},
            replication: { type: 'automatic', locations: [] },
            rotation: undefined,
            ttl: undefined,
            expireTime: undefined,
            topics: [],
            etag: '"abc"',
          },
        ],
        nextPageToken: 'next',
        totalSize: 70,
      });
    });

    it('serializes filter as a repeated param, never the axios bracket form', async () => {
      // Asserting the params object alone is not enough. Axios's default serializer emits
      // `filter[]=x`, which Google rejects with
      // `Unknown name "filter[]": Cannot bind query parameter` (verified live against Secret
      // Manager), so the serialized string itself is what gets asserted.
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('listSecrets').handler(mockContext, {
        projectId: PROJECT,
        filter: 'name:api',
      });

      const [, options] = mockClient.get.mock.calls[0];
      const serialized = options.paramsSerializer(options.params);
      expect(serialized).toBe('filter=name%3Aapi');
      expect(serialized).not.toContain('%5B%5D');
      expect(serialized).not.toContain('[]');
    });

    it('emits each entry separately if an array ever reaches the query string', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('listSecrets').handler(mockContext, { projectId: PROJECT });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.paramsSerializer({ filter: ['a', 'b'] })).toBe('filter=a&filter=b');
    });

    it('omits undefined params from the query string entirely', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('listSecrets').handler(mockContext, { projectId: PROJECT });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.paramsSerializer(options.params)).toBe('');
    });

    it('returns an empty list when the project has no secrets', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      const result = await getAction('listSecrets').handler(mockContext, { projectId: PROJECT });

      expect(result).toEqual({ secrets: [], nextPageToken: undefined, totalSize: undefined });
    });
  });

  describe('getSecret', () => {
    it('requests the secret resource path', async () => {
      mockClient.get.mockResolvedValue({ data: { name: `projects/1/secrets/${SECRET}` } });

      await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      expect(mockClient.get).toHaveBeenCalledWith(SECRET_BASE);
    });

    it('does not percent-encode the structural slashes of the resource path', async () => {
      // Verified live: the fully-encoded form returns 404 while the plain form returns 200, so
      // only individual segments may be encoded.
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      const [url] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/${PROJECT}/secrets/${SECRET}`);
      expect(url).not.toContain('%2F');
    });

    it('normalizes a user-managed replication into a flat locations list', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: `projects/1/secrets/${SECRET}`,
          replication: {
            userManaged: { replicas: [{ location: 'us-east1' }, { location: 'europe-west1' }] },
          },
        },
      });

      const result = (await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      })) as { replication: { type: string; locations: string[] } };

      expect(result.replication).toEqual({
        type: 'user-managed',
        locations: ['us-east1', 'europe-west1'],
      });
    });

    it('defaults absent map fields to empty objects rather than undefined', async () => {
      // The live API omits labels, annotations and versionAliases entirely when unset, so a
      // workflow iterating them would otherwise fail on undefined.
      mockClient.get.mockResolvedValue({ data: { name: `projects/1/secrets/${SECRET}` } });

      const result = (await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      })) as { labels: Record<string, string>; annotations: Record<string, string> };

      expect(result.labels).toEqual({});
      expect(result.annotations).toEqual({});
    });

    it('surfaces the rotation policy when the secret has one', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: `projects/1/secrets/${SECRET}`,
          rotation: { nextRotationTime: '2026-09-01T00:00:00Z', rotationPeriod: '2592000s' },
        },
      });

      const result = (await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      })) as { rotation?: { rotationPeriod?: string } };

      expect(result.rotation).toEqual({
        nextRotationTime: '2026-09-01T00:00:00Z',
        rotationPeriod: '2592000s',
      });
    });
  });

  describe('listSecretVersions', () => {
    it('requests the versions collection under the secret', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          versions: [
            {
              name: `projects/1/secrets/${SECRET}/versions/4`,
              state: 'ENABLED',
              createTime: '2026-01-01T00:00:00Z',
              etag: '"v4"',
            },
          ],
          totalSize: 4,
        },
      });

      const result = await getAction('listSecretVersions').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        pageSize: 5,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${SECRET_BASE}/versions`,
        expect.objectContaining({
          params: { filter: undefined, pageSize: 5, pageToken: undefined },
        })
      );
      expect(result).toEqual({
        versions: [
          {
            name: `projects/1/secrets/${SECRET}/versions/4`,
            version: '4',
            state: 'ENABLED',
            createTime: '2026-01-01T00:00:00Z',
            destroyTime: undefined,
            scheduledDestroyTime: undefined,
            etag: '"v4"',
          },
        ],
        nextPageToken: undefined,
        totalSize: 4,
      });
    });

    it('reports a destroyed version state so a rotation audit can see it', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          versions: [
            {
              name: `projects/1/secrets/${SECRET}/versions/1`,
              state: 'DESTROYED',
              destroyTime: '2026-02-01T00:00:00Z',
            },
          ],
        },
      });

      const result = (await getAction('listSecretVersions').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      })) as { versions: Array<{ state?: string; destroyTime?: string }> };

      expect(result.versions[0].state).toBe('DESTROYED');
      expect(result.versions[0].destroyTime).toBe('2026-02-01T00:00:00Z');
    });
  });

  describe('getSecretVersion', () => {
    it('requests a specific version', async () => {
      mockClient.get.mockResolvedValue({
        data: { name: `projects/1/secrets/${SECRET}/versions/3`, state: 'ENABLED' },
      });

      await getAction('getSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: '3',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${SECRET_BASE}/versions/3`);
    });

    it('accepts the latest alias', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('getSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${SECRET_BASE}/versions/latest`);
    });

    it('never returns a payload field even if the API sent one', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          name: `projects/1/secrets/${SECRET}/versions/3`,
          payload: { data: SECRET_VALUE_B64 },
        },
      });

      const result = await getAction('getSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: '3',
      });

      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE);
      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE_B64);
    });
  });

  describe('accessSecretVersion', () => {
    const accessResponse = {
      data: {
        name: `projects/1/secrets/${SECRET}/versions/4`,
        payload: { data: SECRET_VALUE_B64, dataCrc32c: '1234567890' },
      },
    };

    it('issues a GET against the :access verb, not a POST', async () => {
      // The discovery doc defines versions.access as a GET. A POST here would 404.
      mockClient.get.mockResolvedValue(accessResponse);

      await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${SECRET_BASE}/versions/latest:access`);
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('withholds the secret value by default', async () => {
      mockClient.get.mockResolvedValue(accessResponse);

      const result = (await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      })) as Record<string, unknown>;

      expect(result.payloadIncluded).toBe(false);
      expect(result).not.toHaveProperty('payload');
      // Belt and braces: neither the decoded nor the encoded value may appear anywhere in the
      // serialized output, since that output lands in the workflow execution record.
      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE);
      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE_B64);
    });

    it('returns verifiable metadata instead of the value', async () => {
      mockClient.get.mockResolvedValue(accessResponse);

      const result = await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      });

      expect(result).toEqual({
        name: `projects/1/secrets/${SECRET}/versions/4`,
        version: '4',
        dataCrc32c: '1234567890',
        payloadBytes: SECRET_VALUE.length,
        payloadIncluded: false,
      });
    });

    it('returns no digest of the value, which would be brute-forceable for a weak secret', async () => {
      mockClient.get.mockResolvedValue(accessResponse);

      const result = (await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      })) as Record<string, unknown>;

      expect(result).not.toHaveProperty('payloadSha256');
    });

    it('returns the decoded value only when revealPayload is explicitly true', async () => {
      mockClient.get.mockResolvedValue(accessResponse);

      const result = (await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
        revealPayload: true,
      })) as { payload?: string; payloadIncluded: boolean };

      expect(result.payloadIncluded).toBe(true);
      expect(result.payload).toBe(SECRET_VALUE);
    });

    it('treats a false revealPayload the same as omitting it', async () => {
      mockClient.get.mockResolvedValue(accessResponse);

      const result = (await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
        revealPayload: false,
      })) as Record<string, unknown>;

      expect(result.payloadIncluded).toBe(false);
      expect(result).not.toHaveProperty('payload');
    });

    it('handles a version with no payload without throwing', async () => {
      mockClient.get.mockResolvedValue({
        data: { name: `projects/1/secrets/${SECRET}/versions/4` },
      });

      const result = (await getAction('accessSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'latest',
      })) as { payloadBytes: number; payloadIncluded: boolean };

      expect(result.payloadBytes).toBe(0);
      expect(result.payloadIncluded).toBe(false);
    });

    it('warns about the execution record in its description', () => {
      const { description } = getAction('accessSecretVersion');
      expect(description).toContain('WARNING');
      expect(description).toContain('revealPayload');
    });
  });

  describe('addSecretVersion', () => {
    it('base64-encodes the payload and posts to the secret-level verb', async () => {
      mockClient.post.mockResolvedValue({
        data: { name: `projects/1/secrets/${SECRET}/versions/5`, state: 'ENABLED' },
      });

      const result = await getAction('addSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        payload: SECRET_VALUE,
      });

      // The verb hangs off the secret, not off a version.
      expect(mockClient.post).toHaveBeenCalledWith(`${SECRET_BASE}:addVersion`, {
        payload: { data: SECRET_VALUE_B64 },
      });
      expect(result).toEqual({
        name: `projects/1/secrets/${SECRET}/versions/5`,
        version: '5',
        state: 'ENABLED',
        createTime: undefined,
        destroyTime: undefined,
        scheduledDestroyTime: undefined,
        etag: undefined,
      });
    });

    it('does not echo the new value back to the caller', async () => {
      mockClient.post.mockResolvedValue({
        data: {
          name: `projects/1/secrets/${SECRET}/versions/5`,
          payload: { data: SECRET_VALUE_B64 },
        },
      });

      const result = await getAction('addSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        payload: SECRET_VALUE,
      });

      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE);
      expect(JSON.stringify(result)).not.toContain(SECRET_VALUE_B64);
    });
  });

  describe('version lifecycle', () => {
    it.each([
      ['disableSecretVersion', 'disable'],
      ['enableSecretVersion', 'enable'],
      ['destroySecretVersion', 'destroy'],
    ])('%s posts to the :%s verb on the version', async (action, verb) => {
      mockClient.post.mockResolvedValue({
        data: { name: `projects/1/secrets/${SECRET}/versions/2` },
      });

      await getAction(action).handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: '2',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${SECRET_BASE}/versions/2:${verb}`, {});
    });

    it.each(['disableSecretVersion', 'enableSecretVersion', 'destroySecretVersion'])(
      '%s sends the etag in the body when one is given',
      async (action) => {
        // Per the discovery doc these requests carry the etag in the JSON body, not the query
        // string, so this pins the correct half of that choice.
        mockClient.post.mockResolvedValue({ data: {} });

        await getAction(action).handler(mockContext, {
          projectId: PROJECT,
          secretId: SECRET,
          version: '2',
          etag: '"abc123"',
        });

        const [, body] = mockClient.post.mock.calls[0];
        expect(body).toEqual({ etag: '"abc123"' });
      }
    );

    it('reports the resulting state so a workflow can confirm the change', async () => {
      mockClient.post.mockResolvedValue({
        data: { name: `projects/1/secrets/${SECRET}/versions/2`, state: 'DISABLED' },
      });

      const result = (await getAction('disableSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: '2',
      })) as { state?: string; version?: string };

      expect(result.state).toBe('DISABLED');
      expect(result.version).toBe('2');
    });
  });

  describe('createSecret', () => {
    it('sends secretId as a query param and automatic replication in the body', async () => {
      // secretId is a query parameter on this endpoint. Putting it in the body silently creates
      // nothing useful, so the exact request shape is asserted here.
      mockClient.post.mockResolvedValue({ data: { name: `projects/1/secrets/${SECRET}` } });

      await getAction('createSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        replication: 'automatic',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/secrets`,
        { replication: { automatic: {} } },
        expect.objectContaining({ params: { secretId: SECRET } })
      );
    });

    it('maps user-managed replication to a replicas list', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await getAction('createSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        replication: 'user-managed',
        replicaLocations: ['us-east1', 'europe-west1'],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body).toEqual({
        replication: {
          userManaged: { replicas: [{ location: 'us-east1' }, { location: 'europe-west1' }] },
        },
      });
    });

    it('rejects user-managed replication with no regions before calling the API', async () => {
      await expect(
        getAction('createSecret').handler(mockContext, {
          projectId: PROJECT,
          secretId: SECRET,
          replication: 'user-managed',
        })
      ).rejects.toThrow('replicaLocations must list at least one region');
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('includes optional labels and ttl only when supplied', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await getAction('createSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        replication: 'automatic',
        labels: { env: 'prod' },
        ttl: '86400s',
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body).toEqual({
        replication: { automatic: {} },
        labels: { env: 'prod' },
        ttl: '86400s',
      });
    });
  });

  describe('updateSecret', () => {
    it('derives the required updateMask from the fields actually set', async () => {
      // updateMask is required and is a query param. Without it the PATCH is rejected.
      mockClient.patch.mockResolvedValue({ data: { name: `projects/1/secrets/${SECRET}` } });

      await getAction('updateSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        labels: { env: 'staging' },
      });

      expect(mockClient.patch).toHaveBeenCalledWith(
        SECRET_BASE,
        { labels: { env: 'staging' } },
        expect.objectContaining({ params: { updateMask: 'labels' } })
      );
    });

    it('masks each half of the rotation message separately', async () => {
      // Masking `rotation` wholesale would clear whichever half the caller did not send.
      mockClient.patch.mockResolvedValue({ data: {} });

      await getAction('updateSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        rotationPeriod: '2592000s',
      });

      const [, body, options] = mockClient.patch.mock.calls[0];
      expect(body).toEqual({ rotation: { rotationPeriod: '2592000s' } });
      expect(options.params.updateMask).toBe('rotation.rotation_period');
    });

    it('uses snake_case mask paths and combines several fields', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await getAction('updateSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        labels: { env: 'prod' },
        versionAliases: { prod: '3' },
        expireTime: '2026-12-31T23:59:59Z',
      });

      const [, , options] = mockClient.patch.mock.calls[0];
      expect(options.params.updateMask).toBe('labels,version_aliases,expire_time');
    });

    it('serializes a multi-field updateMask as one comma-joined param', async () => {
      mockClient.patch.mockResolvedValue({ data: {} });

      await getAction('updateSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        labels: { env: 'prod' },
        ttl: '86400s',
      });

      const [, , options] = mockClient.patch.mock.calls[0];
      expect(options.paramsSerializer(options.params)).toBe('updateMask=labels%2Cttl');
    });
  });

  describe('deleteSecret', () => {
    it('deletes the secret and reports the id back', async () => {
      mockClient.delete.mockResolvedValue({ data: {} });

      const result = await getAction('deleteSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        SECRET_BASE,
        expect.objectContaining({ params: {} })
      );
      expect(result).toEqual({ deleted: true, secretId: SECRET });
    });

    it('passes the etag as a query param when given', async () => {
      // On DELETE the etag is a query param, unlike the version verbs where it is a body field.
      mockClient.delete.mockResolvedValue({ data: {} });

      await getAction('deleteSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        etag: '"abc123"',
      });

      const [, options] = mockClient.delete.mock.calls[0];
      expect(options.params).toEqual({ etag: '"abc123"' });
    });
  });

  describe('getSecretIamPolicy', () => {
    it('issues a GET with the policy version as a query param', async () => {
      // Secret Manager's getIamPolicy is a GET with a query param, unlike Cloud Resource
      // Manager's, which is a POST with a JSON body. Copying the IAM connector would be wrong.
      mockClient.get.mockResolvedValue({ data: { version: 3, etag: '"pol"', bindings: [] } });

      await getAction('getSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${SECRET_BASE}:getIamPolicy`,
        expect.objectContaining({ params: { 'options.requestedPolicyVersion': 3 } })
      );
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('serializes the dotted policy-version param without brackets', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('getSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      const [, options] = mockClient.get.mock.calls[0];
      // URLSearchParams leaves a dot unescaped, so the param name reaches Google intact.
      expect(options.paramsSerializer(options.params)).toBe('options.requestedPolicyVersion=3');
    });

    it('preserves conditional bindings verbatim', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          version: 3,
          etag: '"pol"',
          bindings: [
            {
              role: 'roles/secretmanager.secretAccessor',
              members: ['serviceAccount:a@b.iam.gserviceaccount.com'],
              condition: { expression: 'request.time < timestamp("2026-12-31T00:00:00Z")' },
            },
          ],
        },
      });

      const result = await getAction('getSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      expect(result).toEqual({
        version: 3,
        etag: '"pol"',
        bindings: [
          {
            role: 'roles/secretmanager.secretAccessor',
            members: ['serviceAccount:a@b.iam.gserviceaccount.com'],
            condition: { expression: 'request.time < timestamp("2026-12-31T00:00:00Z")' },
          },
        ],
      });
    });

    it('returns an empty bindings list when the secret has no direct policy', async () => {
      // The live API returns only an etag in this case, since access is inherited from the
      // project. An empty list must not be read as "nobody can access this".
      mockClient.get.mockResolvedValue({ data: { etag: '"pol"' } });

      const result = await getAction('getSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
      });

      expect(result).toEqual({ version: undefined, etag: '"pol"', bindings: [] });
    });

    it('explains the inheritance caveat in its description', () => {
      expect(getAction('getSecretIamPolicy').description).toContain('inherited');
    });
  });

  describe('setSecretIamPolicy', () => {
    it('wraps the bindings and echoes the etag back', async () => {
      mockClient.post.mockResolvedValue({ data: { version: 3, etag: '"new"', bindings: [] } });

      await getAction('setSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        bindings: [
          {
            role: 'roles/secretmanager.secretAccessor',
            members: ['serviceAccount:a@b.iam.gserviceaccount.com'],
          },
        ],
        etag: '"old"',
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${SECRET_BASE}:setIamPolicy`, {
        policy: {
          version: 3,
          bindings: [
            {
              role: 'roles/secretmanager.secretAccessor',
              members: ['serviceAccount:a@b.iam.gserviceaccount.com'],
            },
          ],
          etag: '"old"',
        },
      });
    });

    it('honours an explicit policy version', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await getAction('setSecretIamPolicy').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        bindings: [],
        etag: '"old"',
        version: 1,
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.policy.version).toBe(1);
    });

    it('states that it replaces the whole policy', () => {
      expect(getAction('setSecretIamPolicy').description).toContain('REPLACES');
    });
  });

  describe('path encoding', () => {
    it('encodes a secret id that contains a path-corrupting character', async () => {
      // The schema bounds the charset, but the handler must not rely on that: an unencoded
      // segment would silently change which resource is addressed.
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('getSecret').handler(mockContext, {
        projectId: PROJECT,
        secretId: 'a/b',
      });

      const [url] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/${PROJECT}/secrets/a%2Fb`);
    });

    it('encodes the project id segment', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('listSecrets').handler(mockContext, { projectId: 'a b' });

      const [url] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/a%20b/secrets`);
    });

    it('encodes the version segment', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await getAction('getSecretVersion').handler(mockContext, {
        projectId: PROJECT,
        secretId: SECRET,
        version: 'a/b',
      });

      const [url] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${SECRET_BASE}/versions/a%2Fb`);
    });
  });

  describe('error handling', () => {
    it('surfaces the Google error message and status', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              status: 'PERMISSION_DENIED',
              message:
                'Permission "secretmanager.versions.access" denied for resource "projects/p/secrets/s".',
            },
          },
        },
      });

      await expect(
        getAction('accessSecretVersion').handler(mockContext, {
          projectId: PROJECT,
          secretId: SECRET,
          version: 'latest',
        })
      ).rejects.toThrow(
        'Google Cloud Secret Manager API error (403) [PERMISSION_DENIED]: Permission "secretmanager.versions.access" denied for resource "projects/p/secrets/s".'
      );
    });

    it('falls back to the raw body when there is no error envelope', async () => {
      mockClient.get.mockRejectedValue({ response: { status: 500, data: { oops: true } } });

      await expect(
        getAction('getSecret').handler(mockContext, { projectId: PROJECT, secretId: SECRET })
      ).rejects.toThrow('Google Cloud Secret Manager API error (500): {"oops":true}');
    });

    it('rethrows a non-HTTP failure untouched', async () => {
      mockClient.get.mockRejectedValue(new Error('socket hang up'));

      await expect(
        getAction('getSecret').handler(mockContext, { projectId: PROJECT, secretId: SECRET })
      ).rejects.toThrow('socket hang up');
    });

    it('never includes a secret value in an error raised from the access path', async () => {
      mockClient.get.mockRejectedValue({
        response: { status: 400, data: { error: { message: 'bad request', status: 'INVALID' } } },
      });

      await expect(
        getAction('accessSecretVersion').handler(mockContext, {
          projectId: PROJECT,
          secretId: SECRET,
          version: 'latest',
        })
      ).rejects.not.toThrow(SECRET_VALUE);
    });
  });

  describe('test handler', () => {
    it('lists a single secret in the configured project', async () => {
      mockClient.get.mockResolvedValue({ data: { secrets: [] } });
      const ctx = {
        client: mockClient,
        config: { defaultProjectId: PROJECT },
      } as unknown as ActionContext;

      const result = await GcpSecretManager.test?.handler?.(ctx);

      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/secrets`,
        expect.objectContaining({ params: { pageSize: 1 } })
      );
      // ConnectorTestHandlerResult declares `ok?: never`, so the handler must signal success
      // by resolving rather than by returning an ok flag.
      expect(result).toEqual({
        message: 'Successfully connected to the Google Cloud Secret Manager API',
      });
    });

    it('explains what to configure when no project id is set', async () => {
      const ctx = { client: mockClient, config: {} } as unknown as ActionContext;

      await expect(GcpSecretManager.test?.handler?.(ctx)).rejects.toThrow(
        'Set the "Default project ID" configuration field'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });

    it('throws with the Google error detail when the credentials are rejected', async () => {
      // The test handler must fail loudly rather than reporting ok on a 401.
      mockClient.get.mockRejectedValue({
        response: {
          status: 401,
          data: { error: { status: 'UNAUTHENTICATED', message: 'Invalid credentials' } },
        },
      });
      const ctx = {
        client: mockClient,
        config: { defaultProjectId: PROJECT },
      } as unknown as ActionContext;

      await expect(GcpSecretManager.test?.handler?.(ctx)).rejects.toThrow(
        'Google Cloud Secret Manager API error (401) [UNAUTHENTICATED]: Invalid credentials'
      );
    });
  });
});
