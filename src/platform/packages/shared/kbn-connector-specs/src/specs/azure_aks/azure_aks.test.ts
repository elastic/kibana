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
    it('patches only the count property', async () => {
      mockClient.patch.mockResolvedValueOnce({
        data: { properties: { provisioningState: 'Updating' } },
      });
      await AzureAks.actions.scaleNodePool.handler(mockContext, {
        resourceGroupName: RG,
        clusterName: CLUSTER,
        nodePoolName: 'nodepool1',
        count: 3,
      });
      expect(mockClient.patch).toHaveBeenCalledWith(
        expect.stringContaining('/agentPools/nodepool1'),
        { properties: { count: 3 } },
        expect.any(Object)
      );
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
