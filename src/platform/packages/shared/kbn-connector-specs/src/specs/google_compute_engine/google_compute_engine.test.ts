/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { GoogleComputeEngine } from './google_compute_engine';

const API = 'https://compute.googleapis.com/compute/v1';
const PROJECT = 'my-project-123';
const ZONE = 'us-central1-a';
const INSTANCE = 'web-server-1';
const INSTANCE_URL = `${API}/projects/${PROJECT}/zones/${ZONE}/instances/${INSTANCE}`;

const operationResponse = (overrides: Record<string, unknown> = {}) => ({
  data: {
    name: 'operation-1754500000000-abc123',
    status: 'RUNNING',
    operationType: 'stop',
    progress: 0,
    targetLink: `${API}/projects/${PROJECT}/zones/${ZONE}/instances/${INSTANCE}`,
    insertTime: '2026-08-06T10:00:00.000-07:00',
    ...overrides,
  },
});

describe('GoogleComputeEngine', () => {
  const mockClient = { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() };
  const mockContext = {
    client: mockClient,
    config: {},
    log: { debug: jest.fn() },
  } as unknown as ActionContext;

  const getAction = (name: string) => {
    const action = GoogleComputeEngine.actions[name];
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
      expect(GoogleComputeEngine.metadata.displayName).toBe('Google Compute Engine');
    });

    it('supports workflows and agentBuilder features', () => {
      expect(GoogleComputeEngine.metadata.supportedFeatureIds).toEqual([
        'workflows',
        'agentBuilder',
      ]);
    });

    it('authenticates with a GCP service account', () => {
      expect(GoogleComputeEngine.auth?.types).toEqual(['gcp_service_account']);
    });

    it('warns in the skill that mutations are asynchronous', () => {
      expect(GoogleComputeEngine.skill).toContain('asynchronous');
      expect(GoogleComputeEngine.skill).toContain('getOperation');
    });
  });

  describe('isTool split', () => {
    const readOnlyTools = [
      'listInstances',
      'getInstance',
      'listFirewalls',
      'getFirewall',
      'getOperation',
    ];
    const mutatingActions = [
      'stopInstance',
      'startInstance',
      'resetInstance',
      'setInstanceTags',
      'setInstanceLabels',
      'createSnapshot',
      'deleteInstance',
      'insertFirewall',
      'patchFirewall',
    ];

    it.each(readOnlyTools)('exposes %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(true);
    });

    it.each(mutatingActions)('does not expose %s as an agent tool', (name) => {
      expect(getAction(name).isTool).toBe(false);
    });

    it('gives every action a description', () => {
      for (const action of Object.values(GoogleComputeEngine.actions)) {
        expect(typeof action.description === 'string' && action.description.length > 0).toBe(true);
      }
    });
  });

  describe('listInstances', () => {
    it('uses the aggregated endpoint and flattens the zone map when no zone is given', async () => {
      // The aggregated response is a map keyed by "zones/<zone>", and a zone with no instances
      // carries a `warning` instead of an `instances` array.
      mockClient.get.mockResolvedValue({
        data: {
          items: {
            'zones/us-central1-a': { instances: [{ name: 'a', status: 'RUNNING' }] },
            'zones/us-east1-b': { warning: { code: 'NO_RESULTS_ON_PAGE' } },
            'zones/europe-west1-c': { instances: [{ name: 'b', status: 'TERMINATED' }] },
          },
          nextPageToken: 'next',
        },
      });

      const result = (await getAction('listInstances').handler(mockContext, {
        projectId: PROJECT,
      })) as { instances: Array<{ name?: string }>; nextPageToken?: string };

      const [url, options] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/${PROJECT}/aggregated/instances`);
      expect(options.params).toEqual({
        filter: undefined,
        maxResults: undefined,
        pageToken: undefined,
        fields: expect.stringContaining('items/*/instances('),
      });
      expect(result.instances.map((i) => i.name)).toEqual(['a', 'b']);
      expect(result.nextPageToken).toBe('next');
    });

    it('requests a partial-response fields mask so the aggregated list stays under the 1MB response cap', async () => {
      // Live check on a real project: unmasked this response was 2,045,231 bytes and the
      // framework rejected it with "maxContentLength size of 1048576 exceeded" before the
      // handler ran. Masked it was 190,875 bytes. The mask must also keep nextPageToken,
      // or pagination silently stops after one page.
      mockClient.get.mockResolvedValue({ data: { items: {} } });

      await getAction('listInstances').handler(mockContext, { projectId: PROJECT });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.fields).toBe(
        'items/*/instances(id,name,status,zone,machineType,creationTimestamp,deletionProtection,tags/items,tags/fingerprint,labels,labelFingerprint,networkInterfaces(networkIP,network,accessConfigs/natIP),disks(deviceName,boot,source,diskSizeGb)),nextPageToken'
      );
      // The mask is what guarantees metadata and serviceAccounts are never even fetched.
      expect(options.params.fields).not.toContain('metadata');
      expect(options.params.fields).not.toContain('serviceAccounts');
    });

    it('uses the zonal endpoint when a zone is given', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [{ name: 'a' }] } });

      await getAction('listInstances').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        filter: 'status = "RUNNING"',
        pageSize: 10,
      });

      const [url, options] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/${PROJECT}/zones/${ZONE}/instances`);
      expect(options.params).toEqual({
        filter: 'status = "RUNNING"',
        maxResults: 10,
        pageToken: undefined,
        fields: expect.stringContaining('items('),
      });
      // The zonal form wraps the mask in items(...), not items/*/instances(...).
      expect(options.params.fields).not.toContain('items/*/instances(');
    });

    it('sends the filter as a single string, not an array', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [] } });

      await getAction('listInstances').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        filter: 'status = "RUNNING"',
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(typeof options.params.filter).toBe('string');
    });
  });

  describe('getInstance', () => {
    it('trims selfLink URLs down to short names and splits internal from external IPs', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          id: '123',
          name: INSTANCE,
          status: 'RUNNING',
          zone: `${API}/projects/${PROJECT}/zones/${ZONE}`,
          machineType: `${API}/projects/${PROJECT}/zones/${ZONE}/machineTypes/n2-standard-4`,
          tags: { items: ['web-node'], fingerprint: 'AAAAAAAAAAA=' },
          labels: { env: 'dev' },
          networkInterfaces: [
            {
              networkIP: '10.128.0.43',
              network: `${API}/projects/${PROJECT}/global/networks/default`,
              accessConfigs: [{ natIP: '35.202.12.11', type: 'ONE_TO_ONE_NAT' }],
            },
          ],
          disks: [
            {
              deviceName: 'persistent-disk-0',
              boot: true,
              source: `${API}/projects/${PROJECT}/zones/${ZONE}/disks/boot-disk`,
              diskSizeGb: '50',
            },
          ],
          // Deliberately present to prove it is dropped: instance metadata can carry startup
          // scripts and secrets that must not reach an agent or a workflow log.
          metadata: { items: [{ key: 'startup-script', value: 'export TOKEN=SECRET-VALUE' }] },
        },
      });

      const result = await getAction('getInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      });

      expect(mockClient.get).toHaveBeenCalledWith(INSTANCE_URL, {
        params: { fields: expect.any(String) },
      });
      expect(result).toEqual({
        id: '123',
        name: INSTANCE,
        status: 'RUNNING',
        zone: ZONE,
        machineType: 'n2-standard-4',
        creationTimestamp: undefined,
        deletionProtection: false,
        networkTags: ['web-node'],
        labels: { env: 'dev' },
        internalIps: ['10.128.0.43'],
        externalIps: ['35.202.12.11'],
        networks: ['default'],
        disks: [
          { deviceName: 'persistent-disk-0', boot: true, diskName: 'boot-disk', diskSizeGb: '50' },
        ],
      });
      // Instance metadata must never be surfaced.
      expect(JSON.stringify(result)).not.toContain('SECRET-VALUE');
      expect(JSON.stringify(result)).not.toContain('startup-script');
    });

    it('masks the instance read but still requests both fingerprints the writes depend on', async () => {
      // The mask is what stops metadata being fetched at all, but dropping tags/fingerprint or
      // labelFingerprint from it would break setInstanceTags and setInstanceLabels, which read
      // the instance to get them for optimistic concurrency.
      mockClient.get.mockResolvedValue({ data: { name: INSTANCE } });

      await getAction('getInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      });

      const [, options] = mockClient.get.mock.calls[0];
      expect(options.params.fields).toContain('tags/fingerprint');
      expect(options.params.fields).toContain('labelFingerprint');
      expect(options.params.fields).not.toContain('metadata');
      expect(options.params.fields).not.toContain('serviceAccounts');
      // A single-resource read takes a bare mask, not a list wrapper.
      expect(options.params.fields).not.toContain('items(');
    });

    it('normalizes missing tags and labels to empty rather than undefined', async () => {
      mockClient.get.mockResolvedValue({ data: { name: INSTANCE, status: 'RUNNING' } });

      const result = (await getAction('getInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { networkTags: string[]; labels: Record<string, string>; externalIps: string[] };

      expect(result.networkTags).toEqual([]);
      expect(result.labels).toEqual({});
      expect(result.externalIps).toEqual([]);
    });

    it('surfaces the Google error message and reason', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 403,
          data: {
            error: {
              message: 'Required permission compute.instances.get',
              errors: [{ reason: 'forbidden' }],
            },
          },
        },
      });

      await expect(
        getAction('getInstance').handler(mockContext, {
          projectId: PROJECT,
          zone: ZONE,
          instanceName: INSTANCE,
        })
      ).rejects.toThrow(
        'Google Compute Engine API error (403) [forbidden]: Required permission compute.instances.get'
      );
    });
  });

  describe('instance lifecycle', () => {
    it.each([
      ['stopInstance', 'stop'],
      ['startInstance', 'start'],
      ['resetInstance', 'reset'],
    ])('%s posts to the %s endpoint and returns the operation', async (action, verb) => {
      mockClient.post.mockResolvedValue(operationResponse({ operationType: verb }));

      const result = (await getAction(action).handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { operationName?: string; done: boolean; zone?: string };

      expect(mockClient.post).toHaveBeenCalledWith(`${INSTANCE_URL}/${verb}`, {});
      expect(result.operationName).toBe('operation-1754500000000-abc123');
      // RUNNING must not read as finished: a workflow claiming "stopped" here would be wrong.
      expect(result.done).toBe(false);
      expect(result.zone).toBe(ZONE);
    });

    it('reports done only when the operation status is DONE', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ status: 'DONE', progress: 100 }));

      const result = (await getAction('stopInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { done: boolean };

      expect(result.done).toBe(true);
    });

    it('surfaces operation errors rather than reporting a bare success', async () => {
      mockClient.post.mockResolvedValue(
        operationResponse({
          status: 'DONE',
          error: { errors: [{ code: 'RESOURCE_NOT_READY', message: 'Instance is not ready' }] },
        })
      );

      const result = (await getAction('stopInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { errors: Array<{ code?: string; message?: string }> };

      expect(result.errors).toEqual([
        { code: 'RESOURCE_NOT_READY', message: 'Instance is not ready' },
      ]);
    });

    it('reports a DONE-but-failed operation as done yet NOT succeeded', async () => {
      // Google defines DONE as "completed processing, successfully OR with an error", so a
      // failed operation still reports done. Observed live: a delete that finished DONE with
      // RESOURCE_NOT_FOUND, and a snapshot DONE with RESOURCE_ALREADY_EXISTS. A workflow
      // branching on `done` alone would call a failed containment action a success.
      mockClient.post.mockResolvedValue(
        operationResponse({
          status: 'DONE',
          error: {
            errors: [{ code: 'RESOURCE_NOT_FOUND', message: 'The resource was not found' }],
          },
        })
      );

      const result = (await getAction('stopInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { done: boolean; succeeded: boolean };

      expect(result.done).toBe(true);
      expect(result.succeeded).toBe(false);
    });

    it('reports a clean DONE operation as succeeded', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ status: 'DONE' }));

      const result = (await getAction('stopInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { done: boolean; succeeded: boolean };

      expect(result.done).toBe(true);
      expect(result.succeeded).toBe(true);
    });

    it('does not claim success while an operation is still RUNNING', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ status: 'RUNNING' }));

      const result = (await getAction('stopInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      })) as { done: boolean; succeeded: boolean };

      expect(result.done).toBe(false);
      expect(result.succeeded).toBe(false);
    });

    it('deletes an instance with DELETE, not POST', async () => {
      mockClient.delete.mockResolvedValue(operationResponse({ operationType: 'delete' }));

      await getAction('deleteInstance').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(INSTANCE_URL);
      expect(mockClient.post).not.toHaveBeenCalled();
    });
  });

  describe('setInstanceTags', () => {
    const withCurrentTags = (items: string[], fingerprint = 'AAAAAAAAAAA=') => {
      mockClient.get.mockResolvedValue({
        data: { name: INSTANCE, tags: { items, fingerprint } },
      });
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'setTags' }));
    };

    it('MERGES addTags with existing tags and sends the required fingerprint', async () => {
      // The whole point: network tags are what firewall rules match on, so a quarantine tag
      // must not drop the tags existing rules already target.
      withCurrentTags(['web-node', 'web']);

      const result = (await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        addTags: ['quarantine'],
      })) as { changed: boolean; previousTags: string[]; networkTags: string[] };

      expect(mockClient.get).toHaveBeenCalledWith(INSTANCE_URL, {
        params: { fields: expect.stringContaining('tags/fingerprint') },
      });
      expect(mockClient.post).toHaveBeenCalledWith(`${INSTANCE_URL}/setTags`, {
        items: ['web-node', 'web', 'quarantine'],
        fingerprint: 'AAAAAAAAAAA=',
      });
      expect(result.changed).toBe(true);
      expect(result.previousTags).toEqual(['web-node', 'web']);
      expect(result.networkTags).toEqual(['web-node', 'web', 'quarantine']);
    });

    it('removes only the named tag and keeps the rest', async () => {
      withCurrentTags(['web-node', 'quarantine']);

      await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        removeTags: ['quarantine'],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.items).toEqual(['web-node']);
    });

    it('replaces the whole list when replaceTags is used', async () => {
      withCurrentTags(['web-node', 'web']);

      await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        replaceTags: ['quarantine'],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.items).toEqual(['quarantine']);
    });

    it('does not write when the tag set would not change', async () => {
      withCurrentTags(['web-node', 'quarantine']);

      const result = (await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        addTags: ['quarantine'],
      })) as { changed: boolean; reason?: string };

      expect(result.changed).toBe(false);
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('reports the no-op as a terminal success so a polling workflow does not stall', async () => {
      // The no-op path makes no API call, so there is no operation to poll. It still reports
      // done and succeeded, so a workflow that unconditionally checks them treats "already
      // quarantined" as a completed step rather than an undefined operation.
      withCurrentTags(['quarantine']);

      const result = (await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        addTags: ['quarantine'],
      })) as { changed: boolean; done: boolean; succeeded: boolean; operationName?: string };

      expect(result.changed).toBe(false);
      expect(result.done).toBe(true);
      expect(result.succeeded).toBe(true);
      expect(result.operationName).toBeUndefined();
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('treats duplicate current tags as unchanged rather than issuing a pointless write', async () => {
      // currentTags is raw API output while the computed list is deduplicated, so comparing
      // lengths plus one-way containment would not establish set equality.
      withCurrentTags(['web', 'web']);

      const result = (await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        addTags: ['web'],
      })) as { changed: boolean };

      expect(result.changed).toBe(false);
      expect(mockClient.post).not.toHaveBeenCalled();
    });

    it('deduplicates on the addTags path, not just on replaceTags', async () => {
      withCurrentTags(['web']);

      await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        addTags: ['quarantine', 'quarantine'],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.items).toEqual(['web', 'quarantine']);
    });

    it('deduplicates tags so a repeated add cannot produce a duplicate entry', async () => {
      withCurrentTags(['web']);

      await getAction('setInstanceTags').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        replaceTags: ['web', 'web', 'quarantine'],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.items).toEqual(['web', 'quarantine']);
    });

    it('requires at least one tag operation', () => {
      const schema = getAction('setInstanceTags').input;
      expect(
        schema?.safeParse({ projectId: PROJECT, zone: ZONE, instanceName: INSTANCE }).success
      ).toBe(false);
    });

    it('rejects combining replaceTags with a relative edit', () => {
      const schema = getAction('setInstanceTags').input;
      expect(
        schema?.safeParse({
          projectId: PROJECT,
          zone: ZONE,
          instanceName: INSTANCE,
          replaceTags: ['a'],
          addTags: ['b'],
        }).success
      ).toBe(false);
    });
  });

  describe('setInstanceLabels', () => {
    it('sends the labelFingerprint read from the instance', async () => {
      mockClient.get.mockResolvedValue({
        data: { name: INSTANCE, labels: { env: 'dev' }, labelFingerprint: 'abc123=' },
      });
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'setLabels' }));

      const result = (await getAction('setInstanceLabels').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        instanceName: INSTANCE,
        labels: { incident: 'inc-1234' },
      })) as { previousLabels: Record<string, string> };

      expect(mockClient.post).toHaveBeenCalledWith(`${INSTANCE_URL}/setLabels`, {
        labels: { incident: 'inc-1234' },
        labelFingerprint: 'abc123=',
      });
      expect(result.previousLabels).toEqual({ env: 'dev' });
    });
  });

  describe('createSnapshot', () => {
    it('posts to the disk createSnapshot endpoint', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'createSnapshot' }));

      const result = (await getAction('createSnapshot').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        diskName: 'boot-disk',
        snapshotName: 'inc-1234-boot',
        description: 'Evidence for inc-1234',
      })) as { snapshotName: string; zone?: string };

      expect(mockClient.post).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/zones/${ZONE}/disks/boot-disk/createSnapshot`,
        { name: 'inc-1234-boot', description: 'Evidence for inc-1234' }
      );
      expect(result.snapshotName).toBe('inc-1234-boot');
      // Snapshot operations are zonal, so the zone must ride along for the poll.
      expect(result.zone).toBe(ZONE);
    });

    it('omits an absent description rather than sending an empty string', async () => {
      mockClient.post.mockResolvedValue(operationResponse());

      await getAction('createSnapshot').handler(mockContext, {
        projectId: PROJECT,
        zone: ZONE,
        diskName: 'boot-disk',
        snapshotName: 'snap-1',
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body).toEqual({ name: 'snap-1' });
    });
  });

  describe('firewalls', () => {
    it('lists rules from the global collection', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          items: [
            {
              name: 'allow-ssh',
              network: `${API}/projects/${PROJECT}/global/networks/default`,
              direction: 'INGRESS',
              priority: 1000,
              targetTags: ['web'],
              allowed: [{ IPProtocol: 'tcp', ports: ['22'] }],
            },
          ],
        },
      });

      const result = (await getAction('listFirewalls').handler(mockContext, {
        projectId: PROJECT,
      })) as { firewalls: Array<{ network?: string; denied: unknown[] }> };

      const [url, options] = mockClient.get.mock.calls[0];
      expect(url).toBe(`${API}/projects/${PROJECT}/global/firewalls`);
      expect(options.params).toEqual({
        filter: undefined,
        maxResults: undefined,
        pageToken: undefined,
        // 226,822 bytes unmasked on a real project, 168,574 masked.
        fields: expect.stringContaining('items('),
      });
      expect(options.params.fields).toContain('nextPageToken');
      expect(result.firewalls[0].network).toBe('default');
      expect(result.firewalls[0].denied).toEqual([]);
    });

    it('creates a deny-all isolation rule scoped to a tag', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'insert' }));

      const result = (await getAction('insertFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'quarantine-deny-all',
        direction: 'INGRESS',
        priority: 0,
        targetTags: ['quarantine'],
        sourceRanges: ['0.0.0.0/0'],
        denied: [{ IPProtocol: 'all' }],
      })) as { zone?: string };

      expect(mockClient.post).toHaveBeenCalledWith(`${API}/projects/${PROJECT}/global/firewalls`, {
        name: 'quarantine-deny-all',
        direction: 'INGRESS',
        priority: 0,
        targetTags: ['quarantine'],
        sourceRanges: ['0.0.0.0/0'],
        denied: [{ IPProtocol: 'all' }],
      });
      // Firewall operations are GLOBAL, so no zone may be attached or the poll 404s.
      expect(result.zone).toBeUndefined();
    });

    it('qualifies a bare network name to a full URL on insert', async () => {
      // Compute Engine rejects an unqualified network with
      // `400 Invalid value for field 'resource.network': 'default'. The URL is malformed.`,
      // verified against the live API, even though getFirewall trims networks to that bare name.
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'insert' }));

      await getAction('insertFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'quarantine-deny-all',
        network: 'default',
        denied: [{ IPProtocol: 'all' }],
      });

      const [, body] = mockClient.post.mock.calls[0];
      expect(body.network).toBe(`${API}/projects/${PROJECT}/global/networks/default`);
    });

    it('passes an already-qualified network reference through untouched', async () => {
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'insert' }));
      const qualified = `${API}/projects/${PROJECT}/global/networks/wf-net`;

      await getAction('insertFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'quarantine-deny-all',
        network: qualified,
        denied: [{ IPProtocol: 'all' }],
      });

      expect(mockClient.post.mock.calls[0][1].network).toBe(qualified);

      // A relative structural path is also already qualified: it must not be re-prefixed.
      mockClient.post.mockClear();
      mockClient.post.mockResolvedValue(operationResponse({ operationType: 'insert' }));
      await getAction('insertFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'quarantine-deny-all',
        network: 'global/networks/wf-net',
        denied: [{ IPProtocol: 'all' }],
      });
      expect(mockClient.post.mock.calls[0][1].network).toBe('global/networks/wf-net');
    });

    it('requires either denied or allowed on insert', () => {
      const schema = getAction('insertFirewall').input;
      expect(schema?.safeParse({ projectId: PROJECT, firewallName: 'r1' }).success).toBe(false);
      expect(
        schema?.safeParse({
          projectId: PROJECT,
          firewallName: 'r1',
          denied: [{ IPProtocol: 'all' }],
        }).success
      ).toBe(true);
    });

    it('patches only the fields provided and reports which changed', async () => {
      mockClient.patch.mockResolvedValue(operationResponse({ operationType: 'patch' }));

      const result = (await getAction('patchFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'allow-ssh',
        disabled: true,
      })) as { changedFields: string[] };

      expect(mockClient.patch).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/global/firewalls/allow-ssh`,
        { disabled: true }
      );
      expect(result.changedFields).toEqual(['disabled']);
    });

    it('requires at least one field to change on patch', () => {
      const schema = getAction('patchFirewall').input;
      expect(schema?.safeParse({ projectId: PROJECT, firewallName: 'allow-ssh' }).success).toBe(
        false
      );
    });

    it('requests a fields mask on a single rule read, without the items() wrapper', async () => {
      mockClient.get.mockResolvedValue({ data: { name: 'allow-ssh' } });

      await getAction('getFirewall').handler(mockContext, {
        projectId: PROJECT,
        firewallName: 'allow-ssh',
      });

      const [, options] = mockClient.get.mock.calls[0];
      // A single-resource read is not a list, so the mask is bare field names.
      expect(options.params.fields).toBe(
        'id,name,network,direction,priority,disabled,targetTags,sourceTags,sourceRanges,destinationRanges,allowed,denied,description,creationTimestamp'
      );
      expect(options.params.fields).not.toContain('items(');
    });
  });

  describe('getOperation', () => {
    it('polls the zonal endpoint when a zone is given', async () => {
      mockClient.get.mockResolvedValue(operationResponse({ status: 'DONE' }));

      const result = (await getAction('getOperation').handler(mockContext, {
        projectId: PROJECT,
        operationName: 'operation-1754500000000-abc123',
        zone: ZONE,
      })) as { done: boolean };

      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/zones/${ZONE}/operations/operation-1754500000000-abc123`
      );
      expect(result.done).toBe(true);
    });

    it('polls the global endpoint when no zone is given', async () => {
      mockClient.get.mockResolvedValue(operationResponse({ status: 'DONE' }));

      await getAction('getOperation').handler(mockContext, {
        projectId: PROJECT,
        operationName: 'operation-1754500000000-abc123',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${API}/projects/${PROJECT}/global/operations/operation-1754500000000-abc123`
      );
    });

    it('rejects an operation name that is not an operation', () => {
      const schema = getAction('getOperation').input;
      expect(
        schema?.safeParse({ projectId: PROJECT, operationName: '../../instances/web' }).success
      ).toBe(false);
    });
  });

  describe('test handler', () => {
    it('is enabled so the Test connector button works', () => {
      expect(GoogleComputeEngine.test?.enabled).toBe(true);
    });

    it('lists zones when a default project is configured', async () => {
      mockClient.get.mockResolvedValue({ data: { items: [{ name: ZONE }] } });
      const ctx = {
        client: mockClient,
        config: { defaultProjectId: PROJECT },
        log: { debug: jest.fn() },
      } as unknown as ActionContext;

      const result = await GoogleComputeEngine.test?.handler?.(ctx);

      expect(mockClient.get).toHaveBeenCalledWith(`${API}/projects/${PROJECT}/zones`, {
        params: { maxResults: 1 },
      });
      // ConnectorTestHandlerResult declares `ok?: never`, so the handler signals success by
      // resolving rather than by returning an ok flag.
      expect(result).toEqual({
        message: 'Successfully connected to the Google Compute Engine API',
      });
    });

    it('explains that a default project is needed rather than calling an empty path', async () => {
      await expect(GoogleComputeEngine.test?.handler?.(mockContext)).rejects.toThrow(
        /Set a default project ID/
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('input validation', () => {
    it('rejects a zone that is not a zone', () => {
      const schema = getAction('getInstance').input;
      const base = { projectId: PROJECT, instanceName: INSTANCE };
      expect(schema?.safeParse({ ...base, zone: 'us-central1' }).success).toBe(false);
      expect(schema?.safeParse({ ...base, zone: ZONE }).success).toBe(true);
    });

    it('accepts zones whose region number has two digits', () => {
      // europe-west10-* (Berlin) and europe-west12-* (Turin) are live zones. A single-digit
      // pattern rejected them, which made the connector unusable in those regions because
      // zone is required on 9 of the 14 actions.
      const schema = getAction('getInstance').input;
      const base = { projectId: PROJECT, instanceName: INSTANCE };
      for (const zone of ['europe-west10-a', 'europe-west12-c', 'us-central1-a']) {
        expect(schema?.safeParse({ ...base, zone }).success).toBe(true);
      }
    });

    it('accepts a system-generated operation name, not only the "operation-" prefix', () => {
      // Compute Engine also emits systemevent- and repair- operations (live migration,
      // automatic restarts, host repairs), all observed live on a real project. A workflow
      // reading such a name out of an operations list must be able to poll it.
      const schema = getAction('getOperation').input;
      const base = { projectId: PROJECT };
      for (const operationName of [
        'operation-1785188908134-6579eaeb9f124-af8c2ca1-48ddd25a',
        'systemevent-1543845145000-57c1e7574b840-a195b637-5ff74d9b',
        'repair-1785292704535-657b6d9795279-f903f24b-aa789162',
      ]) {
        expect(schema?.safeParse({ ...base, operationName }).success).toBe(true);
      }
      // Still rejects a traversal attempt and an empty value.
      expect(schema?.safeParse({ ...base, operationName: '../../../etc/passwd' }).success).toBe(
        false
      );
      expect(schema?.safeParse({ ...base, operationName: '' }).success).toBe(false);
    });

    it('rejects a path-traversal attempt in the instance name', () => {
      const schema = getAction('getInstance').input;
      expect(
        schema?.safeParse({ projectId: PROJECT, zone: ZONE, instanceName: '../../../etc' }).success
      ).toBe(false);
    });

    it('rejects an uppercase instance name, which Compute Engine does not allow', () => {
      const schema = getAction('getInstance').input;
      expect(
        schema?.safeParse({ projectId: PROJECT, zone: ZONE, instanceName: 'Web-Server' }).success
      ).toBe(false);
    });

    it('bounds the label map to 64 entries', () => {
      const schema = getAction('setInstanceLabels').input;
      const labels: Record<string, string> = {};
      for (let i = 0; i < 65; i++) {
        labels[`key-${i}`] = 'v';
      }
      expect(
        schema?.safeParse({ projectId: PROJECT, zone: ZONE, instanceName: INSTANCE, labels })
          .success
      ).toBe(false);
    });

    it('rejects an invalid protocol on a firewall rule', () => {
      const schema = getAction('insertFirewall').input;
      expect(
        schema?.safeParse({
          projectId: PROJECT,
          firewallName: 'r1',
          denied: [{ IPProtocol: 'not-a-protocol' }],
        }).success
      ).toBe(false);
    });

    it('bounds the firewall filter expression', () => {
      const schema = getAction('listFirewalls').input;
      expect(schema?.safeParse({ projectId: PROJECT, filter: 'x'.repeat(2049) }).success).toBe(
        false
      );
    });
  });
});
