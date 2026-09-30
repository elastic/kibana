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
import { InvokeInputSchema } from './types';

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
    // `getAllPages` resolves a continuation link against the URL axios would
    // request. Every handler here passes an absolute ARM URL, which is the
    // branch where axios returns `url` untouched rather than combining it with
    // a `baseURL`.
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

    // ARM paginates list routes with a nextLink that already carries
    // api-version and a skip token, so its query string is preserved and no
    // params of our own are re-applied.
    it('follows nextLink and concatenates every page', async () => {
      const nextUrl = `${ARM_BASE}/next-page?skipToken=abc`;
      mockClient.get
        .mockResolvedValueOnce({ data: { value: [{ name: 'app-1' }], nextLink: nextUrl } })
        .mockResolvedValueOnce({ data: { value: [{ name: 'app-2' }] } });

      const result = await AzureFunctions.actions.listFunctionApps.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenNthCalledWith(2, nextUrl);
      expect(result).toEqual({ value: [{ name: 'app-1' }, { name: 'app-2' }] });
    });

    // `ctx.client` carries the ARM bearer token, and an explicit request to
    // another host is not covered by axios's cross-host header stripping, so a
    // link naming one would hand the token over.
    it('stops instead of sending the ARM token to another host', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { value: [{ name: 'app-1' }], nextLink: 'https://evil.example/pages?skipToken=abc' },
      });

      const result = await AzureFunctions.actions.listFunctionApps.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ value: [{ name: 'app-1' }], truncated: true });
    });

    // A protocol-relative link inherits the scheme but not the host, so it
    // resolves to a different origin and must stop too.
    it('stops on a protocol-relative link to another host', async () => {
      mockClient.get.mockResolvedValueOnce({
        data: { value: [{ name: 'app-1' }], nextLink: '//evil.example/pages' },
      });

      const result = await AzureFunctions.actions.listFunctionApps.handler(mockContext, {});

      expect(mockClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ value: [{ name: 'app-1' }], truncated: true });
    });

    // A bare `new URL(nextLink)` would throw on a relative link. ARM sends an
    // absolute one, but the helper is shared and must not depend on that.
    it('resolves a relative nextLink against the requested URL', async () => {
      mockClient.get
        .mockResolvedValueOnce({
          data: { value: [{ name: 'app-1' }], nextLink: '?skipToken=abc' },
        })
        .mockResolvedValueOnce({ data: { value: [{ name: 'app-2' }] } });

      const result = await AzureFunctions.actions.listFunctionApps.handler(mockContext, {});

      const [, secondCallUrl] = mockClient.get.mock.calls.map(([callUrl]) => callUrl);
      expect(secondCallUrl).toBe(
        `${ARM_BASE}/subscriptions/${SUB_ID}/providers/Microsoft.Web/sites?skipToken=abc`
      );
      expect(result).toEqual({ value: [{ name: 'app-1' }, { name: 'app-2' }] });
    });

    it('reports truncation instead of pretending the list is complete', async () => {
      // Always returning a nextLink forces the page cap to be hit.
      mockClient.get.mockResolvedValue({
        data: { value: [{ name: 'app' }], nextLink: `${ARM_BASE}/more` },
      });

      const result = (await AzureFunctions.actions.listFunctionApps.handler(mockContext, {})) as {
        value: unknown[];
        truncated?: true;
      };

      expect(result.truncated).toBe(true);
      expect(mockClient.get).toHaveBeenCalledTimes(20);
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

    // The live ARM route returns a sync status, NOT the FunctionSecrets
    // {key, trigger_url} its swagger response schema advertises. Asserting the
    // observed shape here stops the spec drifting back to promising URLs.
    it('re-syncs triggers via a bodyless POST and returns the sync status', async () => {
      mockClient.post.mockResolvedValue({ data: { status: 'success' } });

      const result = await AzureFunctions.actions.listSyncFunctionTriggers.handler(
        mockContext,
        APP_REF
      );

      expect(mockClient.post).toHaveBeenCalledWith(
        `${SITE_BASE}/listsyncfunctiontriggerstatus`,
        undefined,
        { params: { 'api-version': API_VERSION } }
      );
      expect(result).toEqual({ status: 'success' });
    });

    // Re-syncing mutates the app's trigger metadata, so it must not be
    // classified as a read an agent can make freely.
    it('classifies the trigger re-sync as a mutating action', () => {
      expect(AzureFunctions.actions.listSyncFunctionTriggers.scope).toBe('destroy');
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
        // Asserted in detail by the status-handling tests below.
        validateStatus: expect.any(Function),
        // A redirect must not carry the function key to another host.
        maxRedirects: 0,
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

    // A function that deliberately answers 4xx/5xx is reporting its own
    // outcome; axios would otherwise reject and the caller would never see it.
    it('returns a non-2xx function response as a result rather than throwing', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({
        status: 409,
        headers: {},
        data: { error: 'host already quarantined' },
      });

      const result = await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
        functionKey: 'k',
      });

      expect(result).toEqual({
        status: 409,
        headers: {},
        body: { error: 'host already quarantined' },
      });
    });

    // A status cannot say whether a 401 came from a wrong function key or from
    // a function enforcing its own user authorization, so none of them are
    // raised: only a transport failure, which carries no status, throws.
    it('returns every HTTP status as a result', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({ status: 200, headers: {}, data: '' });

      await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'Ping',
        functionKey: 'k',
      });

      const [{ validateStatus }] = mockClient.request.mock.calls[0];
      for (const status of [200, 302, 401, 403, 409, 500]) {
        expect(validateStatus(status)).toBe(true);
      }
    });

    it("returns a function's own authorization response instead of raising it", async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({
        status: 403,
        headers: {},
        data: { error: 'caller not entitled to quarantine this host' },
      });

      const result = await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'QuarantineHost',
        functionKey: 'k',
      });

      expect(result).toEqual({
        status: 403,
        headers: {},
        body: { error: 'caller not entitled to quarantine this host' },
      });
    });

    // axios follows redirects by default and does not strip custom headers
    // across hosts, so following one would hand `x-functions-key` to the
    // redirect target.
    it('never follows a redirect, so the function key cannot leak cross-host', async () => {
      mockClient.get.mockResolvedValue(siteResponse);
      mockClient.request.mockResolvedValue({
        status: 302,
        headers: { location: 'https://login.example.com/authorize' },
        data: '',
      });

      const result = await AzureFunctions.actions.invoke.handler(mockContext, {
        ...APP_REF,
        functionName: 'Ping',
        functionKey: 'secret-key',
      });

      const [requestConfig] = mockClient.request.mock.calls[0];
      expect(requestConfig.maxRedirects).toBe(0);
      // The 3xx comes back as a result, so a caller can see where it pointed.
      expect(result).toEqual({
        status: 302,
        headers: { location: 'https://login.example.com/authorize' },
        body: '',
      });
    });

    // invoke has two phases, and they classify a 401 differently: a rejected
    // connector credential on the ARM hostname lookup is a configuration error
    // and throws, while a 401 from the function itself is returned as a result.
    it('throws when the ARM hostname lookup is rejected, before the function is reached', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 401,
          data: {
            error: {
              code: 'InvalidAuthenticationToken',
              message: 'The access token is invalid.',
            },
          },
        },
      });

      await expect(
        AzureFunctions.actions.invoke.handler(mockContext, {
          ...APP_REF,
          functionName: 'Ping',
          functionKey: 'k',
        })
      ).rejects.toThrow(
        'Azure API error [InvalidAuthenticationToken]: The access token is invalid.'
      );
      // The function was never called, so a 401 here cannot be confused with one
      // the function itself returned.
      expect(mockClient.request).not.toHaveBeenCalled();
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

  // Every other invoke input is bounded; an unbounded body would let one tool
  // call allocate and serialize an arbitrarily large string on the server.
  describe('invoke body bound', () => {
    const validBase = { ...APP_REF, functionName: 'Ping' };

    it('accepts a normal JSON body', () => {
      expect(
        InvokeInputSchema.safeParse({ ...validBase, body: { hostId: 'abc-123' } }).success
      ).toBe(true);
    });

    it('accepts an omitted body', () => {
      expect(InvokeInputSchema.safeParse(validBase).success).toBe(true);
    });

    it('rejects a body over the serialized size cap', () => {
      const result = InvokeInputSchema.safeParse({
        ...validBase,
        body: { blob: 'x'.repeat(1024 * 1024 + 1) },
      });
      expect(result.success).toBe(false);
    });

    // The ASCII case above passes whether the bound counts UTF-16 code units or
    // encoded bytes. This one does not: 400k CJK characters are 400k code units
    // but 1.2 MB of UTF-8, so it only fails when the bound is measured in bytes.
    it('rejects a non-ASCII body that is under the cap by length but over it in bytes', () => {
      const body = { blob: '\u4e2d'.repeat(400_000) };

      expect(JSON.stringify(body).length).toBeLessThan(1024 * 1024);
      expect(Buffer.byteLength(JSON.stringify(body), 'utf8')).toBeGreaterThan(1024 * 1024);
      expect(InvokeInputSchema.safeParse({ ...validBase, body }).success).toBe(false);
    });

    it('accepts a non-ASCII body that fits within the byte cap', () => {
      const body = { blob: '\u4e2d'.repeat(1000) };

      expect(InvokeInputSchema.safeParse({ ...validBase, body }).success).toBe(true);
    });

    it('rejects a body that cannot be serialized', () => {
      const cyclic: Record<string, unknown> = {};
      cyclic.self = cyclic;

      expect(InvokeInputSchema.safeParse({ ...validBase, body: cyclic }).success).toBe(false);
    });
  });

  // The route is interpolated into the URL after the app's own hostname, so it
  // must not be able to introduce a query string, a fragment, or another host.
  describe('invoke route pattern', () => {
    const validBase = { ...APP_REF, functionName: 'Ping' };
    const parseRoute = (route: string) =>
      InvokeInputSchema.safeParse({ ...validBase, route }).success;

    it.each([
      'api/ping',
      'api/quarantine/host',
      'api/v1/a-b_c.d~e',
      // A reserved character in a path parameter, raw and percent-encoded.
      'api/users/alice@example.com',
      'api/users/alice%40example.com',
    ])('accepts %s', (route) => {
      expect(parseRoute(route)).toBe(true);
    });

    it.each([
      // Query parameters belong in `query`, which is serialized safely.
      'api/x?code=1',
      'api/x#frag',
      // Protocol-relative and absolute URLs both point at another host.
      '//evil.com/x',
      'http://evil.com',
      'https://evil.com/x',
      // A malformed escape would reach Azure as an invalid percent sequence.
      'api/%zz',
      'api/ a',
    ])('rejects %s', (route) => {
      expect(parseRoute(route)).toBe(false);
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
