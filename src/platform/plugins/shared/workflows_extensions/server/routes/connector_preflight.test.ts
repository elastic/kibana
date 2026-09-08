/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import type { ConnectorSpec } from '@kbn/connector-specs';
import { registerConnectorPreflightRoute, CONNECTOR_PREFLIGHT_ROUTE_PATH } from './connector_preflight';

jest.mock('@kbn/connector-specs', () => ({
  getConnectorSpec: jest.fn(),
  TEST_CONNECTOR_SUB_ACTION: '_test',
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { getConnectorSpec } = require('@kbn/connector-specs');
const mockGetConnectorSpec = getConnectorSpec as jest.Mock;

const specWithTest = {
  metadata: { id: 'github', displayName: 'GitHub' },
  test: { enabled: true, handler: jest.fn() },
  actions: {
    listIssues: { isTool: false, scope: 'read', handler: jest.fn() },
    createIssue: { isTool: true, scope: 'write', handler: jest.fn() },
  },
} as unknown as ConnectorSpec;

const specWithoutTest = {
  metadata: { id: 'legacy', displayName: 'Legacy' },
  test: { enabled: false },
  actions: {
    pull: { isTool: false, scope: 'read', handler: jest.fn() },
  },
} as unknown as ConnectorSpec;

const makeActionsClient = (overrides: { get?: jest.Mock; execute?: jest.Mock } = {}) => ({
  get:
    overrides.get ??
    jest.fn().mockResolvedValue({ id: 'conn-1', actionTypeId: 'github', name: 'GH' }),
  execute: overrides.execute ?? jest.fn().mockResolvedValue({ status: 'ok', data: {} }),
});

const setup = (actionsClient: ReturnType<typeof makeActionsClient>) => {
  const router = httpServiceMock.createRouter();
  registerConnectorPreflightRoute(router, jest.fn().mockResolvedValue(actionsClient), loggerMock.create());
  const [routeConfig, handler] = router.post.mock.calls[0] as any;
  return { routeConfig: routeConfig as any, handler: handler as any };
};

const callHandler = async (handler: any, body: unknown) => {
  const response = httpServerMock.createResponseFactory();
  await handler({}, httpServerMock.createKibanaRequest({ body: body as any }), response);
  return response;
};

describe('registerConnectorPreflightRoute', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers a POST route with internal access and the workflows read privilege', () => {
    const { routeConfig } = setup(makeActionsClient());
    expect(routeConfig.path).toBe(CONNECTOR_PREFLIGHT_ROUTE_PATH);
    expect(routeConfig.options?.access).toBe('internal');
    expect((routeConfig.security?.authz as any)?.requiredPrivileges).toBeDefined();
    expect((routeConfig.validate as any)?.body).toBeDefined();
  });

  it('returns notFound when the connector does not exist', async () => {
    const actionsClient = makeActionsClient({
      get: jest.fn().mockRejectedValue(new Error('Saved object not found')),
    });
    const { handler } = setup(actionsClient);
    const response = await callHandler(handler, { connectorId: 'missing' });
    expect(response.notFound).toHaveBeenCalledTimes(1);
  });

  it('returns badRequest when the connector type has no registered spec', async () => {
    mockGetConnectorSpec.mockReturnValue(undefined);
    const { handler } = setup(makeActionsClient());
    const response = await callHandler(handler, { connectorId: 'conn-1' });
    expect(response.badRequest).toHaveBeenCalledTimes(1);
  });

  it('reports authenticated=true and per-action ok with isTool/scope when the test passes', async () => {
    mockGetConnectorSpec.mockReturnValue(specWithTest);
    const { handler } = setup(makeActionsClient());
    const response = await callHandler(handler, { connectorId: 'conn-1' });
    expect(response.ok).toHaveBeenCalledTimes(1);
    const { body } = response.ok.mock.calls[0][0]!;
    const result = body as {
      authenticated: boolean | null;
      authVerified: boolean;
      results: Array<{ action: string; ok: boolean; isTool?: boolean; scope?: string }>;
    };
    expect(result.authVerified).toBe(true);
    expect(result.authenticated).toBe(true);
    expect(result.results).toEqual([
      { action: 'listIssues', ok: true, isTool: false, scope: 'read' },
      { action: 'createIssue', ok: true, isTool: true, scope: 'write' },
    ]);
  });

  it('runs the auth check through the reserved test sub-action', async () => {
    mockGetConnectorSpec.mockReturnValue(specWithTest);
    const execute = jest.fn().mockResolvedValue({ status: 'ok', data: {} });
    const { handler } = setup(makeActionsClient({ execute }));
    await callHandler(handler, { connectorId: 'conn-1' });
    expect(execute).toHaveBeenCalledWith({
      actionId: 'conn-1',
      params: { subAction: '_test', subActionParams: {} },
    });
  });

  it('reports authenticated=false and per-action auth errors when the test fails', async () => {
    mockGetConnectorSpec.mockReturnValue(specWithTest);
    const execute = jest.fn().mockResolvedValue({ status: 'error', message: 'invalid token' });
    const { handler } = setup(makeActionsClient({ execute }));
    const response = await callHandler(handler, { connectorId: 'conn-1' });
    const { body } = response.ok.mock.calls[0][0]!;
    const result = body as {
      authenticated: boolean | null;
      results: Array<{ action: string; ok: boolean; error?: string }>;
    };
    expect(result.authenticated).toBe(false);
    expect(result.results.every((r) => !r.ok)).toBe(true);
    expect(result.results[0].error).toContain('invalid token');
  });

  it('reports authenticated=null and authVerified=false when the spec has no test (no false-green)', async () => {
    mockGetConnectorSpec.mockReturnValue(specWithoutTest);
    const execute = jest.fn();
    const { handler } = setup(makeActionsClient({ execute }));
    const response = await callHandler(handler, { connectorId: 'conn-1' });
    const { body } = response.ok.mock.calls[0][0]!;
    const result = body as {
      authenticated: boolean | null;
      authVerified: boolean;
      results: Array<{ action: string; ok: boolean }>;
    };
    expect(result.authVerified).toBe(false);
    expect(result.authenticated).toBeNull();
    expect(execute).not.toHaveBeenCalled();
    // Action existence is still validated even without an auth check.
    expect(result.results).toEqual([{ action: 'pull', ok: true, isTool: false, scope: 'read' }]);
  });

  it('flags a requested action that does not exist on the spec', async () => {
    mockGetConnectorSpec.mockReturnValue(specWithTest);
    const { handler } = setup(makeActionsClient());
    const response = await callHandler(handler, {
      connectorId: 'conn-1',
      actions: ['listIssues', 'nonexistent'],
    });
    const { body } = response.ok.mock.calls[0][0]!;
    const result = body as { results: Array<{ action: string; ok: boolean; error?: string }> };
    expect(result.results).toHaveLength(2);
    expect(result.results[0]).toEqual({ action: 'listIssues', ok: true, isTool: false, scope: 'read' });
    expect(result.results[1].ok).toBe(false);
    expect(result.results[1].error).toContain('nonexistent');
  });
});
