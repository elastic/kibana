/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { createDeadline, graphRequest, retryDelayMs, retryTiming } from './graph_client';
import { appActions } from './app_actions';
import { groupActions } from './group_actions';
import { MicrosoftEntraId } from './microsoft_entra_id';
import { riskActions } from './risk_actions';
import { ListRiskyUsersInputSchema, RequestInputSchema } from './types';
import { userActions } from './user_actions';

const USER_ID = '6e7b768e-07e2-4810-8459-485f84f8f204';
const GROUP_ID = '02bd9fd6-8f93-4758-87c3-1fb73740a315';

const makeContext = (
  graphBaseUrl = 'https://graph.microsoft.com',
  extraConfig: Record<string, unknown> = {}
) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { graphBaseUrl, ...extraConfig },
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const graphError = (status: number, message: string) =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { error: { code: 'Code', message } }, headers: {} },
  });

describe('Microsoft Entra ID product edge cases', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('sends the eventual-consistency header with $count and $search on users and groups, and when following a next page', async () => {
    const { ctx, request } = makeContext();
    request.mockResolvedValue({ data: { value: [], '@odata.count': 0 } });

    await userActions.listUsers.handler(ctx, {
      search: '"displayName:Adele"',
      advancedQuery: true,
    });
    await groupActions.listGroups.handler(ctx, {
      filter: "displayName eq 'x'",
      advancedQuery: true,
    });
    await userActions.listUsers.handler(ctx, {
      advancedQuery: true,
      nextLink: 'https://graph.microsoft.com/v1.0/users?$skiptoken=abc',
    });

    for (const call of request.mock.calls) {
      expect(call[0].headers).toEqual({ ConsistencyLevel: 'eventual' });
    }
    expect(request.mock.calls[0][0].url).toContain('$count=true');
    expect(request.mock.calls[0][0].url).toContain('$search=');
  });

  it('sends no eventual-consistency header for a plain filter', async () => {
    const { ctx, request } = makeContext();
    request.mockResolvedValue({ data: { value: [] } });
    await userActions.listUsers.handler(ctx, { filter: "department eq 'Retail'" });
    expect(request.mock.calls[0][0].headers).toBeUndefined();
  });

  it.each([
    ['listUsers', 'users', '$search=%22displayName%3aTest%22&$top=1&$skiptoken=m~A'],
    ['listUsers', 'users', '$filter=startswith(displayName%2c%27T%27)&$count=true&$skiptoken=m~A'],
    ['listGroups', 'groups', '$search=%22displayName%3ademo%22&$top=2&$skiptoken=m~A'],
    ['listGroups', 'groups', '$filter=x&$count=true&$skiptoken=m~A'],
  ] as const)(
    '%s keeps the eventual-consistency header for an advanced-query nextLink passed alone',
    async (action, collection, query) => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [] } });
      const nextLink = `https://graph.microsoft.com/v1.0/${collection}?${query}`;
      const handler =
        action === 'listUsers' ? userActions.listUsers.handler : groupActions.listGroups.handler;
      await handler(ctx, { nextLink });
      expect(request).toHaveBeenCalledTimes(1);
      expect(request.mock.calls[0][0].url).toBe(nextLink);
      expect(request.mock.calls[0][0].headers).toEqual({ ConsistencyLevel: 'eventual' });
    }
  );

  it('sends no eventual-consistency header for a plain nextLink passed alone', async () => {
    const { ctx, request } = makeContext();
    request.mockResolvedValue({ data: { value: [] } });
    await userActions.listUsers.handler(ctx, {
      nextLink:
        'https://graph.microsoft.com/v1.0/users?$filter=startswith(displayName%2c%27T%27)&$top=1&$skiptoken=m~A',
    });
    await groupActions.listGroups.handler(ctx, {
      nextLink: 'https://graph.microsoft.com/v1.0/groups?$top=2&$skiptoken=m~A',
    });
    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls[0][0].headers).toBeUndefined();
    expect(request.mock.calls[1][0].headers).toBeUndefined();
  });

  it('removes a member only through the /$ref route, never the member object', async () => {
    const { ctx, request } = makeContext();
    request.mockResolvedValue({ status: 204, data: '' });

    await groupActions.removeUserFromGroup.handler(ctx, { groupId: GROUP_ID, userId: USER_ID });

    expect(request).toHaveBeenCalledTimes(1);
    expect(request.mock.calls[0][0]).toMatchObject({
      method: 'DELETE',
      url: `https://graph.microsoft.com/v1.0/groups/${GROUP_ID}/members/${USER_ID}/$ref`,
    });
  });

  it("sends every request to the configured national cloud host and surfaces Graph's own error", async () => {
    const { ctx, request } = makeContext('https://graph.microsoft.us');
    request.mockResolvedValueOnce({ data: { id: USER_ID } });
    await userActions.getUser.handler(ctx, { userId: USER_ID });
    expect(request.mock.calls[0][0].url.startsWith('https://graph.microsoft.us/v1.0/users/')).toBe(
      true
    );

    request.mockRejectedValueOnce(
      graphError(400, 'This operation is not available in this national cloud.')
    );
    await expect(
      userActions.resetUserPassword.handler(ctx, {
        userId: USER_ID,
        newPassword: 'Mock-Only-Pass-0000!',
        forceChangePasswordNextSignIn: true,
      })
    ).rejects.toThrow('not available in this national cloud');
  });

  it('reports the revocation as requested and says in its description that it takes a few minutes', async () => {
    const { ctx, request } = makeContext();
    request.mockResolvedValue({ data: { value: true } });

    const result = await userActions.revokeSignInSessions.handler(ctx, { userId: USER_ID });

    expect(result).toEqual({ status: 'requested', userId: USER_ID, value: true });
    expect(userActions.revokeSignInSessions.description).toMatch(/few minutes/);
  });
  it('leaves token refresh to the auth framework: both auth types are OAuth client credentials and an action sets no Authorization header itself', async () => {
    const authTypes = (MicrosoftEntraId.auth?.types ?? []).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(authTypes).toEqual([
      'oauth_client_credentials',
      'oauth_client_credentials_private_key_jwt',
    ]);

    const { ctx, request } = makeContext();
    request.mockResolvedValue({ data: { id: USER_ID } });
    await userActions.getUser.handler(ctx, { userId: USER_ID });
    const config = request.mock.calls[0][0];
    expect(Object.keys(config.headers ?? {}).map((h) => h.toLowerCase())).not.toContain(
      'authorization'
    );
  });
  it('sends a raw request to v1.0 by default and to beta only when useBeta is true', async () => {
    const stable = makeContext();
    stable.request.mockResolvedValue({ status: 200, data: {} });
    await appActions.request.handler(stable.ctx, { method: 'GET', path: '/users' });
    expect(stable.request.mock.calls[0][0].url).toBe('https://graph.microsoft.com/v1.0/users');

    const beta = makeContext('https://graph.microsoft.com', { useBeta: 'true' });
    beta.request.mockResolvedValue({ status: 200, data: {} });
    await appActions.request.handler(beta.ctx, { method: 'GET', path: '/users' });
    expect(beta.request.mock.calls[0][0].url).toBe('https://graph.microsoft.com/beta/users');
  });

  describe('shared HTTP client policy', () => {
    const headersOf = (retryAfter?: string) => (retryAfter ? { 'retry-after': retryAfter } : {});
    const failure = (status: number, retryAfter?: string) =>
      Object.assign(new Error(`status ${status}`), {
        response: {
          status,
          data: { error: { code: 'Code', message: 'm' } },
          headers: headersOf(retryAfter),
        },
      });

    it('retries a 429 after the Retry-After delay, also for a call that is not safe to repeat', async () => {
      const { ctx, request } = makeContext();
      const sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
      request.mockRejectedValueOnce(failure(429, '7')).mockResolvedValueOnce({ status: 201 });
      await graphRequest(ctx, { method: 'POST', url: 'u' }, { idempotent: false });
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep.mock.calls[0][0]).toBeGreaterThanOrEqual(7_000);
      expect(sleep.mock.calls[0][0]).toBeLessThan(7_500);
    });

    it.each([429, 503, 504])(
      'gives up after 3 attempts on a %s and rethrows it',
      async (status) => {
        const { ctx, request } = makeContext();
        request.mockRejectedValue(failure(status));
        await expect(
          graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true })
        ).rejects.toMatchObject({ response: { status } });
        expect(request).toHaveBeenCalledTimes(3);
      }
    );

    it.each([503, 504])(
      'retries a %s for a safe call and not for create-style calls',
      async (status) => {
        const safe = makeContext();
        safe.request.mockRejectedValueOnce(failure(status)).mockResolvedValueOnce({ status: 200 });
        await graphRequest(safe.ctx, { method: 'GET', url: 'u' }, { idempotent: true });
        expect(safe.request).toHaveBeenCalledTimes(2);

        const unsafe = makeContext();
        unsafe.request.mockRejectedValue(failure(status));
        await expect(
          graphRequest(unsafe.ctx, { method: 'POST', url: 'u' }, { idempotent: false })
        ).rejects.toBeDefined();
        expect(unsafe.request).toHaveBeenCalledTimes(1);
      }
    );

    it.each([400, 401, 403, 404, 409])(
      'does not retry a %s: one request, the error surfaces',
      async (status) => {
        const { ctx, request } = makeContext();
        request.mockRejectedValue(failure(status));
        await expect(
          graphRequest(ctx, { method: 'GET', url: 'u' }, { idempotent: true })
        ).rejects.toMatchObject({ response: { status } });
        expect(request).toHaveBeenCalledTimes(1);
      }
    );

    it('caps Retry-After at 60 s and backs off 2 s then 5 s without it', () => {
      expect(retryDelayMs(failure(429, '600'), 1)).toBeLessThan(60_500);
      expect(retryDelayMs(failure(503), 1)).toBeGreaterThanOrEqual(2_000);
      expect(retryDelayMs(failure(503), 2)).toBeGreaterThanOrEqual(5_000);
    });

    it('never waits past the time budget of the action', async () => {
      const { ctx, request } = makeContext();
      const sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
      request.mockRejectedValue(failure(429, '50'));
      await expect(
        graphRequest(
          ctx,
          { method: 'GET', url: 'u' },
          { idempotent: true, deadline: createDeadline(10_000) }
        )
      ).rejects.toMatchObject({ response: { status: 429 } });
      expect(request).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
    });
  });
  describe('limits and risky-user calls that earlier tests left unchecked', () => {
    it('accepts exactly 30 query entries in a raw request and rejects 31', () => {
      const query = (n: number) =>
        Object.fromEntries(Array.from({ length: n }, (_, i) => [`$p${i}`, 'v']));
      const base = { method: 'GET', path: '/users' };
      expect(RequestInputSchema.safeParse({ ...base, query: query(30) }).success).toBe(true);
      expect(RequestInputSchema.safeParse({ ...base, query: query(31) }).success).toBe(false);
    });

    it('accepts a risky-user page size of 500 and rejects 501', () => {
      expect(ListRiskyUsersInputSchema.safeParse({ top: 500 }).success).toBe(true);
      expect(ListRiskyUsersInputSchema.safeParse({ top: 501 }).success).toBe(false);
    });

    it.each(['confirmCompromisedUser', 'dismissRiskyUser'] as const)(
      '%s repeats the change after a 503 (safe to repeat) and sends it once more',
      async (action) => {
        const { ctx, request } = makeContext();
        request
          .mockResolvedValueOnce({ data: { id: USER_ID } })
          .mockRejectedValueOnce(graphError(503, 'unavailable'))
          .mockResolvedValueOnce({ status: 204 });
        const result = await riskActions[action].handler(ctx, { userIds: [USER_ID] });
        expect(result).toMatchObject({ status: 'requested', userIds: [USER_ID], notFound: [] });
        expect(request.mock.calls.filter((c) => c[0].method === 'POST')).toHaveLength(2);
      }
    );

    it.each(['confirmCompromisedUser', 'dismissRiskyUser'] as const)(
      '%s carries status 404 on the error when none of the users exists',
      async (action) => {
        const { ctx, request } = makeContext();
        request.mockRejectedValue(graphError(404, 'not found'));
        await expect(
          riskActions[action].handler(ctx, { userIds: [USER_ID] })
        ).rejects.toMatchObject({
          status: 404,
          message: expect.stringContaining('found none of the users'),
        });
        expect(request.mock.calls.every((c) => c[0].method === 'GET')).toBe(true);
      }
    );
  });

  describe('ids that go into a URL path', () => {
    const parse = (action: string, input: Record<string, unknown>) =>
      MicrosoftEntraId.actions[action].input.safeParse(input);
    const USER_ID_ACTIONS = ['deleteUser', 'disableUser', 'revokeSignInSessions', 'getUser'];
    const UNSAFE = ['..', '.', ' .. ', '%2e%2e', '%2E', '..%2Fgroups', 'a/b', 'a\\b', '%2f', '%5C'];

    it.each(USER_ID_ACTIONS)(
      '%s refuses a dot segment, a slash and their encoded forms as userId',
      (action) => {
        for (const userId of UNSAFE) {
          const result = parse(action, { userId });
          expect(result.success).toBe(false);
          expect(JSON.stringify(result.error?.issues)).toContain('Must be an id, not a path');
        }
      }
    );

    it('deleteAuthMethod refuses a dot segment, a slash and their encoded forms as methodId and userId', () => {
      for (const methodId of UNSAFE) {
        const result = parse('deleteAuthMethod', {
          userId: USER_ID,
          methodType: 'fido2',
          methodId,
        });
        expect(result.success).toBe(false);
        expect(JSON.stringify(result.error?.issues)).toContain('Must be an id, not a path');
      }
      for (const userId of ['..', '.', '%2e%2e']) {
        expect(
          parse('deleteAuthMethod', { userId, methodType: 'fido2', methodId: 'abc' }).success
        ).toBe(false);
      }
    });

    it.each([
      USER_ID,
      'adele.vance@contoso.onmicrosoft.com',
      'first.last_ext-1@contoso.com',
      '$svc@contoso.com',
      "o'brien@contoso.com",
      '...a',
    ])('accepts the user id %s', (userId) => {
      for (const action of USER_ID_ACTIONS) {
        expect(parse(action, { userId }).success).toBe(true);
      }
    });

    it('accepts the method ids Microsoft Graph returns', () => {
      for (const methodId of [USER_ID, '-2_GRUg2-HYz6_1YG4YRAQ2', '_jpuR-TGZgk6aQCLF3BQjA2']) {
        expect(
          parse('deleteAuthMethod', { userId: USER_ID, methodType: 'fido2', methodId }).success
        ).toBe(true);
      }
    });
  });
});
