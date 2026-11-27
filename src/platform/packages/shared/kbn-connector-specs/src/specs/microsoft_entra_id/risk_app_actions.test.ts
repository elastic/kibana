/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { appActions } from './app_actions';
import { riskActions } from './risk_actions';
import { isAllowedRawPath, retryTiming } from './graph_client';
import {
  RequestInputSchema,
  RevokeUserAppAssignmentInputSchema,
  RiskyUserIdsInputSchema,
} from './types';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const USER_ID = '6e7b768e-07e2-4810-8459-485f84f8f204';
const APP_ID = '0bdbc3c6-8bc2-4c2c-8a42-0e0d9e6a4c2f';
const OTHER_APP_ID = '11111111-2222-3333-4444-555555555555';

const graphError = (status: number, message = 'Graph error') =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { error: { code: 'Code', message } }, headers: {} },
  });

const makeContext = (config: Record<string, unknown> = {}) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('Microsoft Entra ID risk and application actions', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listRiskyUsers', () => {
    it('sends the filter and page size', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [{ id: USER_ID, riskLevel: 'high' }] } });
      const result = await riskActions.listRiskyUsers.handler(ctx, {
        filter: "riskLevel eq 'high'",
        top: 500,
      });
      expect(request.mock.calls[0][0].url).toBe(
        `${GRAPH}/identityProtection/riskyUsers?$filter=${encodeURIComponent(
          "riskLevel eq 'high'"
        )}&$top=500`
      );
      expect(result).toEqual({ value: [{ id: USER_ID, riskLevel: 'high' }] });
    });

    it('explains a 403 with the P2 licence hint', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'tenant is not licensed'));
      await expect(riskActions.listRiskyUsers.handler(ctx, {})).rejects.toThrow(
        /tenant is not licensed.*Microsoft Entra ID P2/
      );
    });
  });

  describe.each([
    ['confirmCompromisedUser', 'confirmCompromised'],
    ['dismissRiskyUser', 'dismiss'],
  ] as const)('%s', (action, operation) => {
    it('looks the user up, posts the user ids and returns them', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ data: { id: USER_ID } });
      request.mockResolvedValueOnce({ status: 204 });
      const result = await riskActions[action].handler(ctx, { userIds: [USER_ID] });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        url: `${GRAPH}/users/${USER_ID}?$select=id`,
      });
      expect(request.mock.calls[1][0]).toMatchObject({
        method: 'POST',
        url: `${GRAPH}/identityProtection/riskyUsers/${operation}`,
        data: { userIds: [USER_ID] },
      });
      expect(result).toEqual({ status: 'requested', userIds: [USER_ID], notFound: [] });
    });

    it('succeeds again on a repeat call with the same ids', async () => {
      const { ctx, request } = makeContext();
      request.mockImplementation(async (config: { method: string }) =>
        config.method === 'GET' ? { data: { id: USER_ID } } : { status: 204 }
      );
      await riskActions[action].handler(ctx, { userIds: [USER_ID] });
      await expect(riskActions[action].handler(ctx, { userIds: [USER_ID] })).resolves.toEqual({
        status: 'requested',
        userIds: [USER_ID],
        notFound: [],
      });
      expect(request.mock.calls[3][0]).toEqual(request.mock.calls[1][0]);
    });

    it('sends only the known ids and lists the unknown ones under notFound', async () => {
      const { ctx, request } = makeContext();
      request.mockImplementation(async (config: { method: string; url: string }) => {
        if (config.method === 'POST') return { status: 204 };
        if (config.url.includes(OTHER_APP_ID)) throw graphError(404, 'Resource does not exist');
        return { data: { id: USER_ID } };
      });
      const result = await riskActions[action].handler(ctx, {
        userIds: [USER_ID, OTHER_APP_ID, USER_ID.toUpperCase()],
      });
      expect(request).toHaveBeenCalledTimes(3);
      expect(request.mock.calls[2][0].data).toEqual({ userIds: [USER_ID] });
      expect(result).toEqual({ status: 'requested', userIds: [USER_ID], notFound: [OTHER_APP_ID] });
    });

    it('fails with the unknown ids and sends nothing when no user exists', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, 'Resource does not exist'));
      await expect(riskActions[action].handler(ctx, { userIds: [USER_ID] })).rejects.toThrow(
        `found none of the users ${USER_ID}`
      );
      expect(request.mock.calls.every(([config]) => config.method === 'GET')).toBe(true);
    });

    it('fails with the Graph message when the user lookup is refused', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'Insufficient privileges'));
      await expect(riskActions[action].handler(ctx, { userIds: [USER_ID] })).rejects.toThrow(
        /access denied \(Code\): Insufficient privileges/
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('fails on a 404 from the risk operation instead of reporting success', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ data: { id: USER_ID } });
      request.mockRejectedValueOnce(graphError(404));
      await expect(riskActions[action].handler(ctx, { userIds: [USER_ID] })).rejects.toThrow(
        /not found/
      );
    });
  });

  it('bounds risky user ids to 1..60 GUIDs', () => {
    const ids = (n: number) => Array.from({ length: n }, () => USER_ID);
    expect(RiskyUserIdsInputSchema.safeParse({ userIds: ids(60) }).success).toBe(true);
    expect(RiskyUserIdsInputSchema.safeParse({ userIds: ids(61) }).success).toBe(false);
    expect(RiskyUserIdsInputSchema.safeParse({ userIds: [] }).success).toBe(false);
    expect(RiskyUserIdsInputSchema.safeParse({ userIds: ['jane@contoso.com'] }).success).toBe(
      false
    );
  });

  describe('listUserAppRoleAssignments', () => {
    it('uses a page size of 100 by default and returns found false for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ data: { value: [{ id: 'a1', resourceId: APP_ID }] } });
      await expect(
        appActions.listUserAppRoleAssignments.handler(ctx, { userId: USER_ID })
      ).resolves.toEqual({ found: true, value: [{ id: 'a1', resourceId: APP_ID }] });
      expect(request.mock.calls[0][0].url).toBe(
        `${GRAPH}/users/${USER_ID}/appRoleAssignments?$top=100`
      );
      request.mockRejectedValueOnce(graphError(404));
      await expect(
        appActions.listUserAppRoleAssignments.handler(ctx, { userId: USER_ID })
      ).resolves.toMatchObject({ found: false });
    });
  });

  describe('revokeUserAppAssignment', () => {
    it('needs exactly one of appRoleAssignmentId and resourceId', () => {
      const parse = (v: object) =>
        RevokeUserAppAssignmentInputSchema.safeParse({ userId: USER_ID, ...v }).success;
      expect(parse({ appRoleAssignmentId: 'abc_DEF-1' })).toBe(true);
      expect(parse({ resourceId: APP_ID })).toBe(true);
      expect(parse({})).toBe(false);
      expect(parse({ appRoleAssignmentId: 'abc', resourceId: APP_ID })).toBe(false);
      expect(parse({ appRoleAssignmentId: '../x' })).toBe(false);
    });

    it('removes one assignment by id', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await appActions.revokeUserAppAssignment.handler(ctx, {
        userId: USER_ID,
        appRoleAssignmentId: 'abc_DEF-1',
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'DELETE',
        url: `${GRAPH}/users/${USER_ID}/appRoleAssignments/abc_DEF-1`,
      });
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        removed: ['abc_DEF-1'],
        failed: [],
        skipped: [],
      });
    });

    it('returns notFound with the same result keys when the assignment id is unknown', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      const result = await appActions.revokeUserAppAssignment.handler(ctx, {
        userId: USER_ID,
        appRoleAssignmentId: 'abc_DEF-1',
      });
      expect(result).toMatchObject({
        status: 'notFound',
        userId: USER_ID,
        removed: [],
        failed: [],
        skipped: [],
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reads every page and removes every assignment to the application', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({
          data: {
            value: [
              { id: 'a1', resourceId: APP_ID },
              { id: 'b1', resourceId: OTHER_APP_ID },
            ],
            '@odata.nextLink': `${GRAPH}/users/${USER_ID}/appRoleAssignments?$skiptoken=p2`,
          },
        })
        .mockResolvedValueOnce({
          data: { value: [{ id: 'a2', resourceId: APP_ID.toUpperCase() }] },
        })
        .mockResolvedValue({ status: 204 });
      const result = await appActions.revokeUserAppAssignment.handler(ctx, {
        userId: USER_ID,
        resourceId: APP_ID,
      });
      expect(request.mock.calls.map((c) => [c[0].method, c[0].url])).toEqual([
        ['GET', `${GRAPH}/users/${USER_ID}/appRoleAssignments?$top=999`],
        ['GET', `${GRAPH}/users/${USER_ID}/appRoleAssignments?$skiptoken=p2`],
        ['DELETE', `${GRAPH}/users/${USER_ID}/appRoleAssignments/a1`],
        ['DELETE', `${GRAPH}/users/${USER_ID}/appRoleAssignments/a2`],
      ]);
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        resourceId: APP_ID,
        removed: ['a1', 'a2'],
        failed: [],
        skipped: [],
      });
    });

    it('makes no authenticated request to an off-origin nextLink', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({
        data: {
          value: [{ id: 'a1', resourceId: APP_ID }],
          '@odata.nextLink': '//evil.example/v1.0/users/x/appRoleAssignments?$skiptoken=p2',
        },
      });
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).rejects.toThrow(/configured Microsoft Graph host/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('marks the result incomplete when the page cap is reached', async () => {
      const { ctx, request } = makeContext();
      const page = {
        data: {
          value: [{ id: 'b', resourceId: OTHER_APP_ID }],
          '@odata.nextLink': `${GRAPH}/users/${USER_ID}/appRoleAssignments?$skiptoken=more`,
        },
      };
      request.mockResolvedValue(page);
      const result = await appActions.revokeUserAppAssignment.handler(ctx, {
        userId: USER_ID,
        resourceId: APP_ID,
      });
      expect(request).toHaveBeenCalledTimes(10);
      expect(result).toMatchObject({ status: 'notFound', incomplete: true });
    });

    it('returns notFound when the user has no assignment to the application', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ data: { value: [{ id: 'b', resourceId: OTHER_APP_ID }] } });
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).resolves.toEqual({
        status: 'notFound',
        userId: USER_ID,
        resourceId: APP_ID,
        removed: [],
        failed: [],
        skipped: [],
        message: 'the user has no assignment to this application',
      });
    });

    it('returns notFound for an unknown user and sends no deletion', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).resolves.toEqual({
        status: 'notFound',
        userId: USER_ID,
        resourceId: APP_ID,
        removed: [],
        failed: [],
        skipped: [],
        message: 'user not found',
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('fails with the Graph message when the assignment lookup is refused', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'Insufficient privileges'));
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).rejects.toThrow(/access denied \(Code\): Insufficient privileges/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports partial failures and fails when nothing could be removed', async () => {
      const { ctx, request } = makeContext();
      const listing = {
        data: {
          value: [
            { id: 'a1', resourceId: APP_ID },
            { id: 'a2', resourceId: APP_ID },
          ],
        },
      };
      request
        .mockResolvedValueOnce(listing)
        .mockResolvedValueOnce({ status: 204 })
        .mockRejectedValueOnce(graphError(400, 'cannot remove'));
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).resolves.toMatchObject({
        status: 'requested',
        removed: ['a1'],
        failed: [{ id: 'a2', status: 400 }],
      });

      request.mockReset();
      request.mockResolvedValueOnce(listing).mockRejectedValue(graphError(403, 'denied'));
      await expect(
        appActions.revokeUserAppAssignment.handler(ctx, { userId: USER_ID, resourceId: APP_ID })
      ).rejects.toThrow(/no assignment could be removed/);
    });
  });

  describe('request', () => {
    it.each([
      ['/users/abc/authentication/temporaryAccessPassMethods', true],
      ["/users('%24svc%40contoso.com')", true],
      ['/groups/abc/members/$ref', true],
      ['/users/alice%40contoso.com', true],
      ['users', false],
      ['//evil.example/x', false],
      ['/users//x', false],
      ['/users/../me', false],
      ['/./users', false],
      ['/v1.0/users', false],
      ['/beta/users', false],
      ['/http://evil.example', false],
      ['/users?$top=1', false],
      ['/users#x', false],
      ['/users/a b', false],
      ['/users/%2e%2e/me', false],
      ['/users/%2E/me', false],
      ['/users/.%2e/me', false],
      ['/users/a%2Fb', false],
      ['/users/a%5cb', false],
      ['/%62eta/users', false],
      ['/v1%2E0/users', false],
      ['/users/%C0', false],
      ['/users/a%2eb', true],
      ['/users/version/beta', true],
    ])('path %s accepted: %s', (path, ok) => {
      expect(isAllowedRawPath(path)).toBe(ok);
      expect(RequestInputSchema.safeParse({ method: 'GET', path }).success).toBe(ok);
    });

    it('takes a body only with POST, PATCH and PUT', () => {
      expect(RequestInputSchema.safeParse({ method: 'GET', path: '/x', body: {} }).success).toBe(
        false
      );
      expect(RequestInputSchema.safeParse({ method: 'PUT', path: '/x', body: {} }).success).toBe(
        true
      );
    });

    it('bounds the body in UTF-8 bytes', () => {
      const ascii = { note: 'a'.repeat(200_000) };
      const multibyte = { note: 'é'.repeat(140_000) };
      expect(
        RequestInputSchema.safeParse({ method: 'POST', path: '/x', body: ascii }).success
      ).toBe(true);
      expect(
        RequestInputSchema.safeParse({ method: 'POST', path: '/x', body: multibyte }).success
      ).toBe(false);
    });

    it('calls v1.0 by default and beta when useBeta is true, with query and body', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 201, data: { id: 'tap' } });
      await expect(
        appActions.request.handler(ctx, {
          method: 'POST',
          path: `/users/${USER_ID}/authentication/temporaryAccessPassMethods`,
          query: { $select: 'id' },
          body: { lifetimeInMinutes: 60 },
        })
      ).resolves.toEqual({ status: 201, data: { id: 'tap' } });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: `${GRAPH}/users/${USER_ID}/authentication/temporaryAccessPassMethods?$select=id`,
        data: { lifetimeInMinutes: 60 },
      });

      const off = makeContext({ useBeta: 'false' });
      off.request.mockResolvedValue({ status: 200, data: {} });
      await appActions.request.handler(off.ctx, { method: 'GET', path: '/me' });
      expect(off.request.mock.calls[0][0].url).toBe('https://graph.microsoft.com/v1.0/me');

      const beta = makeContext({ useBeta: 'true' });
      beta.request.mockResolvedValue({ status: 200, data: {} });
      await appActions.request.handler(beta.ctx, { method: 'GET', path: '/me' });
      expect(beta.request.mock.calls[0][0].url).toBe('https://graph.microsoft.com/beta/me');
    });

    it('sends POST, PATCH and PUT as application/json even without a body (a form type gets 415)', async () => {
      for (const method of ['POST', 'PATCH', 'PUT'] as const) {
        const { ctx, request } = makeContext();
        request.mockResolvedValue({ status: 200, data: { value: true } });
        await appActions.request.handler(ctx, {
          method,
          path: `/users/${USER_ID}/revokeSignInSessions`,
        });
        expect(request.mock.calls[0][0].headers).toEqual({ 'Content-Type': 'application/json' });
        expect(request.mock.calls[0][0]).not.toHaveProperty('data');
      }
      for (const method of ['GET', 'DELETE'] as const) {
        const { ctx, request } = makeContext();
        request.mockResolvedValue({ status: 204, data: undefined });
        await appActions.request.handler(ctx, { method, path: `/users/${USER_ID}` });
        expect(request.mock.calls[0][0]).not.toHaveProperty('headers');
      }
    });

    it('returns a non-2xx answer as the result with its error body', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'denied'));
      await expect(
        appActions.request.handler(ctx, { method: 'DELETE', path: '/users/x' })
      ).resolves.toEqual({ status: 403, data: { error: { code: 'Code', message: 'denied' } } });
    });

    it('retries a 503 for GET only', async () => {
      const get = makeContext();
      get.request
        .mockRejectedValueOnce(graphError(503))
        .mockResolvedValueOnce({ status: 200, data: {} });
      await expect(
        appActions.request.handler(get.ctx, { method: 'GET', path: '/users' })
      ).resolves.toEqual({ status: 200, data: {} });

      const post = makeContext();
      post.request.mockRejectedValue(graphError(503));
      await expect(
        appActions.request.handler(post.ctx, { method: 'POST', path: '/users', body: {} })
      ).resolves.toMatchObject({ status: 503 });
      expect(post.request).toHaveBeenCalledTimes(1);
    });

    it('throws on a transport failure with no HTTP answer', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(new Error('ECONNRESET'));
      await expect(
        appActions.request.handler(ctx, { method: 'GET', path: '/users' })
      ).rejects.toThrow('request failed: ECONNRESET');
    });
  });
});
