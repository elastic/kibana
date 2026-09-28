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
import { AzureFunctions } from './azure_functions';

const ARM_BASE = 'https://management.azure.com';
const SUB_ID = '11111111-1111-1111-1111-111111111111';
const API_VERSION = '2024-11-01';
const RG = 'rg-payments-prod';
const APP = 'payments-fn-prod';
const SITE_BASE = `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.Web/sites/${APP}`;

const APP_REF = { resourceGroupName: RG, functionAppName: APP };

describe('AzureFunctions', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
    request: jest.fn(),
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
    expect(AzureFunctions).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.azure_functions');
    expect(spec).toBe(AzureFunctions);
    expect(spec?.actions.invoke).toBeDefined();
    expect(spec?.actions.invoke.isTool).toBe(true);
  });

  it('has a leading-dot connector id', () => {
    expect(AzureFunctions.metadata.id).toBe('.azure_functions');
  });

  // A third-party action type below a gold license is rejected at registration
  // time by the actions plugin, which crashes Kibana on startup.
  it('requires at least a gold license', () => {
    expect(AzureFunctions.metadata.minimumLicense).toBe('enterprise');
  });

  // A brand-new connector type may only declare 'agentBuilder' until it has
  // reached Production-NonCanary everywhere.
  it('declares only the agentBuilder feature on first release', () => {
    expect(AzureFunctions.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
  });

  it('exposes every action as an agent-discoverable tool with a scope', () => {
    const actionNames = Object.keys(AzureFunctions.actions);
    expect(actionNames.length).toBe(11);
    for (const name of actionNames) {
      expect(AzureFunctions.actions[name].isTool).toBe(true);
      expect(AzureFunctions.actions[name].description).toBeTruthy();
      expect(['read', 'write', 'destroy']).toContain(AzureFunctions.actions[name].scope);
    }
  });

  it('enables the test-connector handler', () => {
    expect(AzureFunctions.test?.enabled).toBe(true);
  });

  describe('missing subscriptionId configuration', () => {
    it('rejects with a formatted error and makes no request', async () => {
      const ctx = { ...mockContext, config: {} } as unknown as ActionContext;

      await expect(AzureFunctions.actions.getFunctionApp.handler(ctx, APP_REF)).rejects.toThrow(
        'Azure API request failed: Azure Functions connector is missing the required subscriptionId configuration field.'
      );
      expect(mockClient.get).not.toHaveBeenCalled();
    });
  });

  describe('getFunctionApp action', () => {
    it('gets the site resource with only api-version', async () => {
      mockClient.get.mockResolvedValue({ data: { properties: { state: 'Running' } } });

      const result = await AzureFunctions.actions.getFunctionApp.handler(mockContext, APP_REF);

      expect(mockClient.get).toHaveBeenCalledWith(SITE_BASE, {
        params: { 'api-version': API_VERSION },
      });
      expect(result).toEqual({ properties: { state: 'Running' } });
    });

    it('throws a formatted Azure error on failure', async () => {
      mockClient.get.mockRejectedValue({
        response: { data: { error: { code: 'ResourceNotFound', message: 'no such site' } } },
      });

      await expect(
        AzureFunctions.actions.getFunctionApp.handler(mockContext, APP_REF)
      ).rejects.toThrow('Azure API error [ResourceNotFound]: no such site');
    });
  });

  describe('listFunctionApps action', () => {
    it('lists subscription-wide when no resource group is given', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureFunctions.actions.listFunctionApps.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Web/sites`,
        { params: { 'api-version': API_VERSION } }
      );
    });

    it('lists by resource group and passes includeSlots when scoped', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureFunctions.actions.listFunctionApps.handler(mockContext, {
        resourceGroupName: RG,
        includeSlots: true,
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/resourceGroups/${RG}/providers/Microsoft.Web/sites`,
        { params: { 'api-version': API_VERSION, includeSlots: true } }
      );
    });

    // includeSlots only exists on the by-resource-group route; the
    // subscription-wide route rejects unknown query params.
    it('drops includeSlots when listing subscription-wide', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureFunctions.actions.listFunctionApps.handler(mockContext, { includeSlots: true });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Web/sites`,
        { params: { 'api-version': API_VERSION } }
      );
    });
  });

  describe('listFunctions / getFunction actions', () => {
    it('lists the functions of an app', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [] } });

      await AzureFunctions.actions.listFunctions.handler(mockContext, APP_REF);

      expect(mockClient.get).toHaveBeenCalledWith(`${SITE_BASE}/functions`, {
        params: { 'api-version': API_VERSION },
      });
    });

    it('gets one function by name', async () => {
      mockClient.get.mockResolvedValue({ data: {} });

      await AzureFunctions.actions.getFunction.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${SITE_BASE}/functions/QuarantineHost`, {
        params: { 'api-version': API_VERSION },
      });
    });
  });

  describe('key-reading actions', () => {
    // These are POST routes that take no request body — the second argument
    // must stay undefined so no Content-Type body is sent.
    it('reads function-level keys via a bodyless POST to /listkeys', async () => {
      mockClient.post.mockResolvedValue({ data: { default: 'abc' } });

      const result = await AzureFunctions.actions.listFunctionKeys.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${SITE_BASE}/functions/QuarantineHost/listkeys`,
        undefined,
        { params: { 'api-version': API_VERSION } }
      );
      expect(result).toEqual({ default: 'abc' });
    });

    it('reads host keys via a bodyless POST to /host/default/listkeys', async () => {
      mockClient.post.mockResolvedValue({ data: { masterKey: 'm', functionKeys: {} } });

      await AzureFunctions.actions.listHostKeys.handler(mockContext, APP_REF);

      expect(mockClient.post).toHaveBeenCalledWith(
        `${SITE_BASE}/host/default/listkeys`,
        undefined,
        { params: { 'api-version': API_VERSION } }
      );
    });

    it('reads trigger URLs via a bodyless POST to /listsyncfunctiontriggerstatus', async () => {
      mockClient.post.mockResolvedValue({ data: { trigger_url: 'https://x/api/y?code=z' } });

      await AzureFunctions.actions.listSyncFunctionTriggers.handler(mockContext, APP_REF);

      expect(mockClient.post).toHaveBeenCalledWith(
        `${SITE_BASE}/listsyncfunctiontriggerstatus`,
        undefined,
        { params: { 'api-version': API_VERSION } }
      );
    });
  });

  describe('lifecycle actions', () => {
    it('restarts an app with only api-version by default', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: '' });

      const result = await AzureFunctions.actions.restartFunctionApp.handler(mockContext, APP_REF);

      expect(mockClient.post).toHaveBeenCalledWith(`${SITE_BASE}/restart`, undefined, {
        params: { 'api-version': API_VERSION },
      });
      expect(result).toEqual({ status: 200, functionAppName: APP });
    });

    // softRestart/synchronous are query-string params on this route, not body
    // fields — the restart route accepts no request body at all. Sending them
    // in a body would be silently ignored by Azure.
    it('sends softRestart and synchronous as query params, not a body', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: '' });

      await AzureFunctions.actions.restartFunctionApp.handler(mockContext, {
        ...APP_REF,
        softRestart: true,
        synchronous: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(`${SITE_BASE}/restart`, undefined, {
        params: { 'api-version': API_VERSION, softRestart: true, synchronous: true },
      });
    });

    it('stops an app', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: '' });

      await AzureFunctions.actions.stopFunctionApp.handler(mockContext, APP_REF);

      expect(mockClient.post).toHaveBeenCalledWith(`${SITE_BASE}/stop`, undefined, {
        params: { 'api-version': API_VERSION },
      });
    });

    it('starts an app', async () => {
      mockClient.post.mockResolvedValue({ status: 200, data: '' });

      await AzureFunctions.actions.startFunctionApp.handler(mockContext, APP_REF);

      expect(mockClient.post).toHaveBeenCalledWith(`${SITE_BASE}/start`, undefined, {
        params: { 'api-version': API_VERSION },
      });
    });
  });

  describe('invoke action', () => {
    const siteResponse = {
      data: { properties: { defaultHostName: `${APP}.azurewebsites.net` } },
    };

    it('resolves the app hostname over ARM, then calls the data plane with the function key', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({
        status: 202,
        headers: { 'content-type': 'application/json' },
        data: { ok: true },
      });

      const result = await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
        body: { hostId: 'abc-123' },
        functionKey: 'secret-key',
      });

      expect(mockClient.get).toHaveBeenCalledWith(SITE_BASE, {
        params: { 'api-version': API_VERSION },
      });
      expect(mockClient.request).toHaveBeenCalledWith({
        method: 'POST',
        url: `https://${APP}.azurewebsites.net/api/QuarantineHost`,
        data: { hostId: 'abc-123' },
        headers: {
          'Content-Type': 'application/json',
          // The ARM-scoped bearer token must not reach the data plane.
          Authorization: undefined,
          'x-functions-key': 'secret-key',
        },
      });
      expect(result).toEqual({
        status: 202,
        headers: { 'content-type': 'application/json' },
        body: { ok: true },
      });
    });

    it('uses a custom route verbatim and passes query params through', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({ status: 200, headers: {}, data: '' });

      await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
        method: 'GET',
        route: 'api/quarantine/host',
        query: { mode: 'dry-run' },
      });

      expect(mockClient.request).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'GET',
          url: `https://${APP}.azurewebsites.net/api/quarantine/host`,
          params: { mode: 'dry-run' },
        })
      );
    });

    it('omits the key header for an anonymous trigger', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({ status: 200, headers: {}, data: '' });

      await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'Ping',
      });

      const [requestConfig] = mockClient.request.mock.calls[0];
      expect(requestConfig.headers['x-functions-key']).toBeUndefined();
      expect(requestConfig.data).toBeUndefined();
    });

    it('fails with an actionable error when the app has no hostname', async () => {
      mockClient.get.mockResolvedValue({ data: { properties: {} } });

      await expect(
        AzureFunctions.actions.invoke.handler(mockContext, {
          ...APP_REF,
          functionName: 'Ping',
        })
      ).rejects.toThrow(
        `Function app '${APP}' has no defaultHostName, so its HTTP trigger endpoint cannot be resolved.`
      );
      expect(mockClient.request).not.toHaveBeenCalled();
    });
  });

  describe('test handler', () => {
    it('reports the number of sites found', async () => {
      mockClient.get.mockResolvedValue({ data: { value: [{ name: APP }, { name: 'other' }] } });

      const result = await AzureFunctions.test?.handler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Web/sites`,
        { params: { 'api-version': API_VERSION } }
      );
      expect(result).toEqual({
        message: 'Successfully connected to Azure: found 2 App Service site(s) in the subscription',
      });
    });
  });
});
