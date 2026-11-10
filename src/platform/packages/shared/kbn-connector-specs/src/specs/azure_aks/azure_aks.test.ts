/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { AzureAks } from './azure_aks';

const SUB_ID = '22222222-2222-2222-2222-222222222222';
const RG = 'my-rg';
const CLUSTER = 'my-cluster';

describe('AzureAks', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    getUri: jest.fn(({ url }: { url: string }) => url),
  };

  const mockContext = {
    client: mockClient,
    config: { subscriptionId: SUB_ID },
    secrets: {
      tokenUrl: 'https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token',
      clientId: 'client-id',
      clientSecret: 'client-secret',
    },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(AzureAks).toBeDefined();
  });

  it('is discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.azure_aks');
    expect(spec).toBe(AzureAks);
    expect(spec?.actions.listClusters).toBeDefined();
  });

  it('has a leading-dot connector id', () => {
    expect(AzureAks.metadata.id).toBe('.azure_aks');
  });

  it('exposes every action as an agent-discoverable tool', () => {
    for (const name of Object.keys(AzureAks.actions)) {
      expect(AzureAks.actions[name].isTool).toBe(true);
    }
  });

  describe('listSubscriptions', () => {
    it('lists all subscriptions without needing a subscriptionId', async () => {
      const ctxNoSub = {
        ...mockContext,
        config: {},
      } as unknown as ActionContext;
      mockClient.get.mockResolvedValueOnce({ data: { value: [{ id: 'sub1' }] } });
      const result = await AzureAks.actions.listSubscriptions.handler(ctxNoSub, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/subscriptions'),
        expect.any(Object)
      );
      expect(result).toEqual({ value: [{ id: 'sub1' }] });
    });

    it('follows nextLink and reports truncation when the page cap is hit', async () => {
      mockClient.get.mockResolvedValue({
        data: {
          value: [{ id: 'sub1' }],
          nextLink: 'https://management.azure.com/subscriptions?skip=next',
        },
      });
      const result = await AzureAks.actions.listSubscriptions.handler(mockContext, {});
      expect(mockClient.get.mock.calls.length).toBeGreaterThan(1);
      expect(result).toEqual(
        expect.objectContaining({ truncated: true, value: expect.any(Array) })
      );
    });

    it('stops pagination at a cross-origin nextLink without following it', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { value: [{ id: 'sub1' }], nextLink: 'https://evil.example/subscriptions?skip=next' },
      });
      const result = await AzureAks.actions.listSubscriptions.handler(mockContext, {});
      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ value: [{ id: 'sub1' }], truncated: true });
    });
  });

  describe('listResourceGroups', () => {
    it('calls the correct ARM endpoint', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { value: [] } });
      await AzureAks.actions.listResourceGroups.handler(mockContext, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://management.azure.com/subscriptions/${SUB_ID}/resourcegroups`,
        expect.any(Object)
      );
    });

    it('throws if subscriptionId is not configured', async () => {
      const ctxNoSub = { ...mockContext, config: {} } as unknown as ActionContext;
      await expect(AzureAks.actions.listResourceGroups.handler(ctxNoSub, {})).rejects.toThrow(
        'Subscription ID'
      );
    });

    it('uses a subscriptionId passed in the input when none is configured, completing the discovery loop', async () => {
      const ctxNoSub = { ...mockContext, config: {} } as unknown as ActionContext;
      const discovered = '33333333-3333-3333-3333-333333333333';
      mockClient.get.mockResolvedValueOnce({ data: { value: [] } });
      await AzureAks.actions.listResourceGroups.handler(ctxNoSub, { subscriptionId: discovered });
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://management.azure.com/subscriptions/${discovered}/resourcegroups`,
        expect.any(Object)
      );
    });

    it('prefers an input subscriptionId over the configured one', async () => {
      const override = '44444444-4444-4444-4444-444444444444';
      mockClient.get.mockResolvedValueOnce({ data: { value: [] } });
      await AzureAks.actions.listResourceGroups.handler(mockContext, { subscriptionId: override });
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://management.azure.com/subscriptions/${override}/resourcegroups`,
        expect.any(Object)
      );
    });
  });

  describe('listClusters', () => {
    it('lists all clusters in subscription when no resourceGroupName given', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { value: [] } });
      await AzureAks.actions.listClusters.handler(mockContext, {});
      expect(mockClient.get).toHaveBeenCalledWith(
        expect.stringContaining('/providers/Microsoft.ContainerService/managedClusters'),
        expect.any(Object)
      );
      expect(mockClient.get.mock.calls[0][0]).not.toContain('/resourceGroups/');
    });

    it('scopes to resource group when resourceGroupName is provided', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { value: [] } });
      await AzureAks.actions.listClusters.handler(mockContext, { resourceGroupName: RG });
      expect(mockClient.get.mock.calls[0][0]).toContain(`/resourceGroups/${RG}/`);
    });
  });

  describe('getCluster', () => {
    it('calls the correct ARM endpoint', async () => {
      mockClient.get.mockResolvedValueOnce({ data: { name: CLUSTER } });
      await AzureAks.actions.getCluster.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
      });
      expect(mockClient.get).toHaveBeenCalledWith(
        `https://management.azure.com/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.ContainerService/managedClusters/${CLUSTER}`,
        expect.any(Object)
      );
    });
  });

  describe('scaleNodePool', () => {
    it('PUTs the current pool with only the count overridden (no PATCH support on this route)', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { properties: { count: 1, vmSize: 'Standard_D2s_v4', mode: 'System' } },
      });
      mockClient.put.mockResolvedValueOnce({
        data: { properties: { provisioningState: 'Updating' } },
      });
      await AzureAks.actions.scaleNodePool.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        nodePoolName: 'nodepool1',
        count: 3,
      });
      expect(mockClient.patch).not.toHaveBeenCalled();
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/agentPools/nodepool1'),
        { properties: { count: 3, vmSize: 'Standard_D2s_v4', mode: 'System' } },
        expect.any(Object)
      );
    });

    it('rejects count=0 on a System pool instead of sending a doomed PUT', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { properties: { count: 1, vmSize: 'Standard_D2s_v4', mode: 'System' } },
      });
      await expect(
        AzureAks.actions.scaleNodePool.handler(mockContext, {
          resourceGroupName: RG,
          clusterName: CLUSTER,
          nodePoolName: 'nodepool1',
          count: 0,
        })
      ).rejects.toThrow('System pool');
      expect(mockClient.put).not.toHaveBeenCalled();
    });

    it('allows count=0 on a User pool', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { properties: { count: 2, vmSize: 'Standard_D2s_v4', mode: 'User' } },
      });
      mockClient.put.mockResolvedValueOnce({
        data: { properties: { provisioningState: 'Updating' } },
      });
      await AzureAks.actions.scaleNodePool.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        nodePoolName: 'userpool1',
        count: 0,
      });
      expect(mockClient.put).toHaveBeenCalledWith(
        expect.stringContaining('/agentPools/userpool1'),
        { properties: { count: 0, vmSize: 'Standard_D2s_v4', mode: 'User' } },
        expect.any(Object)
      );
    });
  });

  describe('getClusterCredentials', () => {
    it('requests the azure format by default, as a query param', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { kubeconfigs: [{ value: 'abc' }] } });
      await AzureAks.actions.getClusterCredentials.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/listClusterUserCredential'),
        {},
        expect.objectContaining({ params: expect.objectContaining({ format: 'azure' }) })
      );
    });

    it('requests the exec format when specified, as a query param (not the body)', async () => {
      mockClient.post.mockResolvedValueOnce({ data: { kubeconfigs: [{ value: 'abc' }] } });
      await AzureAks.actions.getClusterCredentials.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        format: 'exec',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/listClusterUserCredential'),
        {},
        expect.objectContaining({ params: expect.objectContaining({ format: 'exec' }) })
      );
    });
  });

  describe('stopCluster', () => {
    it('POSTs to the stop endpoint and reports acceptance', async () => {
      mockClient.post.mockResolvedValueOnce({ data: '' });
      const result = await AzureAks.actions.stopCluster.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/stop'),
        {},
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({ status: 'accepted' }));
    });
  });

  describe('startCluster', () => {
    it('POSTs to the start endpoint and reports acceptance', async () => {
      mockClient.post.mockResolvedValueOnce({ data: '' });
      const result = await AzureAks.actions.startCluster.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/start'),
        {},
        expect.any(Object)
      );
      expect(result).toEqual(expect.objectContaining({ status: 'accepted' }));
    });
  });

  describe('runCommand', () => {
    beforeEach(() => jest.useFakeTimers({ doNotFake: ['performance'] }));
    afterEach(() => {
      // Drop any sleep still pending on a failed expectation, so the suite leaves no open handle.
      jest.clearAllTimers();
      jest.useRealTimers();
    });

    /**
     * Run the handler to completion under fake timers. The poller interleaves
     * awaited HTTP calls with `setTimeout` sleeps, so each iteration has to
     * flush the microtask queue *and* advance the clock; looping until the
     * promise settles keeps the test independent of the exact number of polls.
     */
    const runToCompletion = async <T>(promise: Promise<T>): Promise<T> => {
      let settled = false;
      const tracked = promise.then(
        (value) => {
          settled = true;
          return value;
        },
        (error) => {
          settled = true;
          throw error;
        }
      );
      for (let i = 0; i < 200 && !settled; i++) {
        await Promise.resolve();
        await Promise.resolve();
        jest.advanceTimersByTime(2000);
      }
      return tracked;
    };

    it('sends a flat body without a properties wrapper', async () => {
      mockClient.post.mockResolvedValueOnce({ headers: {}, data: { status: 'Succeeded' } });
      await AzureAks.actions.runCommand.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        command: 'kubectl get nodes',
      });
      expect(mockClient.post).toHaveBeenCalledWith(
        expect.stringContaining('/runCommand'),
        { command: 'kubectl get nodes' },
        expect.any(Object)
      );
    });

    it('polls the Location header and returns the completed result', async () => {
      mockClient.post.mockResolvedValueOnce({
        headers: { location: 'https://management.azure.com/operation/123' },
        data: {},
      });
      mockClient.get.mockResolvedValueOnce({
        data: { properties: { provisioningState: 'Succeeded', exitCode: 0 } },
      });
      const result = await runToCompletion(
        AzureAks.actions.runCommand.handler(mockContext, {
          resourceGroupName: RG,
          clusterName: CLUSTER,
          command: 'kubectl get nodes',
        })
      );
      expect(mockClient.get).toHaveBeenCalledWith('https://management.azure.com/operation/123');
      expect(result).toEqual({ properties: { provisioningState: 'Succeeded', exitCode: 0 } });
    });

    it('refuses to poll a cross-origin Location header (would leak the bearer token)', async () => {
      mockClient.post.mockResolvedValueOnce({
        headers: { location: 'https://evil.example/operation/123' },
        data: {},
      });
      const result = await AzureAks.actions.runCommand.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        command: 'kubectl get nodes',
      });
      expect(mockClient.get).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          message: expect.stringContaining('evil.example'),
        })
      );
    });

    it('propagates a non-retryable polling error instead of masking it as a timeout', async () => {
      mockClient.post.mockResolvedValueOnce({
        headers: { location: 'https://management.azure.com/operation/123' },
        data: {},
      });
      mockClient.get.mockRejectedValueOnce({
        response: { status: 403, statusText: 'Forbidden', data: {} },
      });
      await expect(
        runToCompletion(
          AzureAks.actions.runCommand.handler(mockContext, {
            resourceGroupName: RG,
            clusterName: CLUSTER,
            command: 'kubectl get nodes',
          })
        )
      ).rejects.toThrow('Access denied');
    });
  });

  describe('test handler', () => {
    const testHandler = AzureAks.test?.handler;
    if (!testHandler) throw new Error('AzureAks.test.handler is not defined');

    it('reports the subscription count on success', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { value: [{ id: 'sub1' }, { id: 'sub2' }] },
      });
      const result = await testHandler(mockContext);
      expect(result.message).toContain('2');
    });

    it('throws on Azure API errors', async () => {
      mockClient.get.mockRejectedValueOnce({
        response: { status: 401, statusText: 'Unauthorized', data: {} },
      });
      await expect(testHandler(mockContext)).rejects.toThrow('Authentication failed');
    });
  });
});
