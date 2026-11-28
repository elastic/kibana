/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { retryTiming } from './graph_client';
import { userActions } from './user_actions';
import { CreateUserInputSchema, UpdateUserInputSchema } from './types';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const USER_ID = '6e7b768e-07e2-4810-8459-485f84f8f204';
const DEFAULT_SELECT =
  'id,userPrincipalName,displayName,mail,accountEnabled,department,jobTitle,signInSessionsValidFromDateTime,lastPasswordChangeDateTime';

const graphError = (status: number, message = 'Graph error') =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { error: { code: 'Code', message } }, headers: {} },
  });

const makeContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { graphBaseUrl: 'https://graph.microsoft.com' },
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const sent = (request: jest.Mock, call = 0) => request.mock.calls[call][0];

describe('Microsoft Entra ID user actions', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUser', () => {
    it('selects the default properties and reports it resolved the object id', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        data: { '@odata.context': 'x', id: USER_ID, accountEnabled: true, department: 'Sales' },
      });
      const result = await userActions.getUser.handler(ctx, { userId: USER_ID });
      expect(sent(request)).toMatchObject({
        method: 'GET',
        url: `${GRAPH}/users/${USER_ID}?$select=${encodeURIComponent(DEFAULT_SELECT)}`,
      });
      expect(result).toEqual({
        found: true,
        resolvedBy: 'id',
        id: USER_ID,
        accountEnabled: true,
        department: 'Sales',
      });
    });

    it('adds id to the caller select list and resolves a userPrincipalName', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { id: USER_ID, jobTitle: 'CFO' } });
      const result = await userActions.getUser.handler(ctx, {
        userId: 'jane@contoso.com',
        select: ['jobTitle'],
      });
      expect(sent(request).url).toBe(`${GRAPH}/users/jane%40contoso.com?$select=id%2CjobTitle`);
      expect(result).toMatchObject({ found: true, resolvedBy: 'userPrincipalName' });
    });

    it('returns found false for an unknown id without a mail lookup', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(userActions.getUser.handler(ctx, { userId: USER_ID })).resolves.toEqual({
        found: false,
        userId: USER_ID,
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('looks an email up by mail, with single quotes doubled', async () => {
      const { ctx, request } = makeContext();
      request
        .mockRejectedValueOnce(graphError(404))
        .mockResolvedValueOnce({ data: { value: [{ id: USER_ID, mail: "o'neil@contoso.com" }] } });
      const result = await userActions.getUser.handler(ctx, { userId: "o'neil@contoso.com" });
      expect(sent(request, 1).url).toBe(
        `${GRAPH}/users?$filter=${encodeURIComponent(
          "mail eq 'o''neil@contoso.com'"
        )}&$select=${encodeURIComponent(DEFAULT_SELECT)}&$top=2`
      );
      expect(result).toEqual({
        found: true,
        resolvedBy: 'mail',
        id: USER_ID,
        mail: "o'neil@contoso.com",
      });
    });

    it('returns found false when no user has the mail address', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValueOnce(graphError(404)).mockResolvedValueOnce({ data: { value: [] } });
      await expect(userActions.getUser.handler(ctx, { userId: 'x@contoso.com' })).resolves.toEqual({
        found: false,
        userId: 'x@contoso.com',
      });
    });

    it('fails with the matching ids when the mail address is shared', async () => {
      const { ctx, request } = makeContext();
      request
        .mockRejectedValueOnce(graphError(404))
        .mockResolvedValueOnce({ data: { value: [{ id: 'a' }, { id: 'b' }] } });
      await expect(userActions.getUser.handler(ctx, { userId: 'x@contoso.com' })).rejects.toThrow(
        'more than one user has the mail address x@contoso.com (a, b)'
      );
    });

    it('uses the key form for a userPrincipalName starting with $', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { id: USER_ID } });
      await userActions.getUser.handler(ctx, { userId: '$svc@contoso.com' });
      expect(sent(request).url).toMatch(/\/users\('%24svc%40contoso\.com'\)\?\$select=/);
    });

    it('surfaces a 403 with the permission hint', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'Insufficient privileges'));
      await expect(userActions.getUser.handler(ctx, { userId: USER_ID })).rejects.toThrow(
        /getUser failed: access denied \(Code\): Insufficient privileges/
      );
    });
  });

  describe('listUsers', () => {
    it('sends filter, top and select, and returns the page', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        data: { value: [{ id: USER_ID }], '@odata.nextLink': `${GRAPH}/users?$skiptoken=t` },
      });
      const result = await userActions.listUsers.handler(ctx, {
        filter: "department eq 'Sales'",
        top: 50,
        select: ['displayName'],
      });
      expect(sent(request)).toMatchObject({
        method: 'GET',
        url: `${GRAPH}/users?$filter=${encodeURIComponent(
          "department eq 'Sales'"
        )}&$top=50&$select=id%2CdisplayName`,
        headers: undefined,
      });
      expect(result).toEqual({ value: [{ id: USER_ID }], nextLink: `${GRAPH}/users?$skiptoken=t` });
    });

    it('sends ConsistencyLevel and $count for an advanced query and returns count', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [], '@odata.count': 7 } });
      const result = await userActions.listUsers.handler(ctx, {
        filter: "endsWith(mail,'@contoso.com')",
        advancedQuery: true,
      });
      expect(sent(request).headers).toEqual({ ConsistencyLevel: 'eventual' });
      expect(sent(request).url).toContain('&$count=true');
      expect(result).toEqual({ value: [], count: 7 });
    });

    it('sends ConsistencyLevel with a search', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [] } });
      await userActions.listUsers.handler(ctx, { search: '"displayName:smith"' });
      expect(sent(request).headers).toEqual({ ConsistencyLevel: 'eventual' });
      expect(sent(request).url).toContain(`$search=${encodeURIComponent('"displayName:smith"')}`);
    });

    it('requests a nextLink as is and ignores the other inputs', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [] } });
      const nextLink = `${GRAPH}/users?$skiptoken=abc&$top=5`;
      await userActions.listUsers.handler(ctx, { nextLink, filter: 'ignored eq 1' });
      expect(sent(request).url).toBe(nextLink);
    });

    it('makes no request for a nextLink on another host', async () => {
      const { ctx, request } = makeContext();
      await expect(
        userActions.listUsers.handler(ctx, { nextLink: '//evil.example/v1.0/users?$skiptoken=a' })
      ).rejects.toThrow(/configured Microsoft Graph host/);
      expect(request).not.toHaveBeenCalled();
    });
  });

  describe('disableUser and enableUser', () => {
    it.each([
      ['disableUser', false],
      ['enableUser', true],
    ] as const)('%s patches accountEnabled=%s', async (action, enabled) => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await userActions[action].handler(ctx, { userId: USER_ID });
      expect(sent(request)).toMatchObject({
        method: 'PATCH',
        url: `${GRAPH}/users/${USER_ID}`,
        data: { accountEnabled: enabled },
      });
      expect(result).toEqual({ status: 'requested', userId: USER_ID, accountEnabled: enabled });
    });

    it('returns notFound with the Graph message for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, "Resource 'x' does not exist"));
      await expect(userActions.disableUser.handler(ctx, { userId: 'x' })).resolves.toEqual({
        status: 'notFound',
        userId: 'x',
        message: "Resource 'x' does not exist",
      });
    });

    it('retries a 503 because the patch is safe to repeat', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValueOnce(graphError(503)).mockResolvedValueOnce({ status: 204 });
      await expect(
        userActions.disableUser.handler(ctx, { userId: USER_ID })
      ).resolves.toMatchObject({ status: 'requested' });
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  it.each([
    ['disableUser', { userId: USER_ID }],
    ['enableUser', { userId: USER_ID }],
    ['revokeSignInSessions', { userId: USER_ID }],
    ['resetUserPassword', { userId: USER_ID, newPassword: 'p' }],
    ['updateUser', { userId: USER_ID, properties: { department: 'Finance' } }],
  ] as const)(
    '%s called twice sends the same request and succeeds both times',
    async (action, input) => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204, data: { value: true } });
      const handler = userActions[action].handler as (
        c: ActionContext,
        i: unknown
      ) => Promise<unknown>;
      const first = await handler(ctx, input);
      const second = await handler(ctx, input);
      expect(second).toEqual(first);
      expect(first).toMatchObject({ status: 'requested' });
      expect(request.mock.calls[1][0]).toEqual(request.mock.calls[0][0]);
    }
  );

  describe('revokeSignInSessions', () => {
    it('posts with no body as application/json (a form content type gets 415) and returns value', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 200, data: { value: true } });
      const result = await userActions.revokeSignInSessions.handler(ctx, { userId: USER_ID });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${GRAPH}/users/${USER_ID}/revokeSignInSessions`,
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      });
      expect(result).toEqual({ status: 'requested', userId: USER_ID, value: true });
    });

    it('returns notFound for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(
        userActions.revokeSignInSessions.handler(ctx, { userId: USER_ID })
      ).resolves.toMatchObject({ status: 'notFound' });
    });
  });

  describe('resetUserPassword', () => {
    it('patches passwordProfile, forces a change by default and never returns the password', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await userActions.resetUserPassword.handler(ctx, {
        userId: USER_ID,
        newPassword: 'Canary-Secret-123!',
      });
      expect(sent(request).data).toEqual({
        passwordProfile: { password: 'Canary-Secret-123!', forceChangePasswordNextSignIn: true },
      });
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        forceChangePasswordNextSignIn: true,
      });
      expect(JSON.stringify(result)).not.toContain('Canary-Secret');
    });

    it('keeps forceChangePasswordNextSignIn false when asked', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      await userActions.resetUserPassword.handler(ctx, {
        userId: USER_ID,
        newPassword: 'p',
        forceChangePasswordNextSignIn: false,
      });
      expect(sent(request).data.passwordProfile.forceChangePasswordNextSignIn).toBe(false);
    });

    it('surfaces the password policy error and does not include the password', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(400, 'The specified password does not comply'));
      const error = await userActions.resetUserPassword
        .handler(ctx, { userId: USER_ID, newPassword: 'Canary-Secret-123!' })
        .catch((e: Error) => e);
      expect((error as Error).message).toContain('The specified password does not comply');
      expect((error as Error).message).not.toContain('Canary-Secret');
    });
  });

  describe('createUser', () => {
    const input = {
      accountEnabled: true,
      displayName: 'Jane Doe',
      mailNickname: 'jdoe',
      userPrincipalName: 'jdoe@contoso.com',
      password: 'Canary-Secret-123!',
    };

    it('posts the user and returns only the new identifiers', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        status: 201,
        data: {
          id: USER_ID,
          userPrincipalName: 'jdoe@contoso.com',
          displayName: 'Jane Doe',
          accountEnabled: true,
          mail: null,
        },
      });
      const result = await userActions.createUser.handler(ctx, input);
      expect(sent(request)).toMatchObject({
        method: 'POST',
        url: `${GRAPH}/users`,
        data: {
          accountEnabled: true,
          displayName: 'Jane Doe',
          mailNickname: 'jdoe',
          userPrincipalName: 'jdoe@contoso.com',
          passwordProfile: { password: 'Canary-Secret-123!', forceChangePasswordNextSignIn: true },
        },
      });
      expect(result).toEqual({
        id: USER_ID,
        userPrincipalName: 'jdoe@contoso.com',
        displayName: 'Jane Doe',
        accountEnabled: true,
      });
    });

    it('does not repeat the create after a 503', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(503));
      await expect(userActions.createUser.handler(ctx, input)).rejects.toThrow(
        /temporarily unavailable/
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([
      [{ ...input, userPrincipalName: 'no-domain' }, false],
      [{ ...input, mailNickname: 'has space' }, false],
      [{ ...input, userPrincipalName: `${'a'.repeat(64)}@${'b'.repeat(48)}` }, true],
      [{ ...input, userPrincipalName: `${'a'.repeat(65)}@${'b'.repeat(48)}` }, false],
    ])('validates the input %#', (value, ok) => {
      expect(CreateUserInputSchema.safeParse(value).success).toBe(ok);
    });

    it.each([
      [`${'a'.repeat(64)}@contoso.com`, true],
      [`${'a'.repeat(65)}@contoso.com`, false],
      [`jdoe@${'b'.repeat(48)}`, true],
      [`jdoe@${'b'.repeat(49)}`, false],
    ])(
      'limits a userPrincipalName to 64 characters before the @ and 48 after it %#',
      (userPrincipalName, ok) => {
        const parsed = CreateUserInputSchema.safeParse({ ...input, userPrincipalName });
        expect(parsed.success).toBe(ok);
        if (!parsed.success) {
          expect(parsed.error.issues[0].message).toMatch(/64 characters before the @ and 48 after/);
        }
      }
    );
  });

  describe('updateUser', () => {
    it('patches only the given properties and names them', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await userActions.updateUser.handler(ctx, {
        userId: USER_ID,
        properties: { department: 'Finance', jobTitle: 'CFO' },
      });
      expect(sent(request).data).toEqual({ department: 'Finance', jobTitle: 'CFO' });
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        updatedProperties: ['department', 'jobTitle'],
      });
    });

    it('sends a null value to Graph as given', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const properties = { department: null };
      expect(UpdateUserInputSchema.parse({ userId: USER_ID, properties }).properties).toEqual(
        properties
      );
      await userActions.updateUser.handler(ctx, { userId: USER_ID, properties });
      expect(sent(request).data).toEqual({ department: null });
    });

    it('surfaces the refusal for a user synced from on-premises Active Directory', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(
        graphError(
          400,
          'Unable to update the specified properties for on-premises mastered Directory Sync objects or objects currently undergoing migration.'
        )
      );
      await expect(
        userActions.updateUser.handler(ctx, { userId: USER_ID, properties: { department: 'X' } })
      ).rejects.toThrow(
        /updateUser failed: Microsoft Graph rejected the request \(Code\): Unable to update .* on-premises mastered/
      );
    });

    it.each([
      [{}, 'at least one'],
      [{ passwordProfile: { password: 'x' } }, 'resetUserPassword'],
      [{ 'bad key': 1 }, 'property name'],
      [{ aboutMe: 'é'.repeat(140_000) }, 'bytes'],
    ])('refuses properties %#', (properties, message) => {
      const result = UpdateUserInputSchema.safeParse({ userId: USER_ID, properties });
      expect(result.success).toBe(false);
      expect(JSON.stringify(result.error?.issues)).toContain(message);
    });

    it('accepts a value just under the byte bound', () => {
      const properties = { aboutMe: 'a'.repeat(200_000) };
      expect(UpdateUserInputSchema.safeParse({ userId: USER_ID, properties }).success).toBe(true);
    });
  });

  describe('deleteUser', () => {
    it('deletes the user and returns notFound for an unknown one', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ status: 204 }).mockRejectedValueOnce(graphError(404));
      await expect(userActions.deleteUser.handler(ctx, { userId: USER_ID })).resolves.toEqual({
        status: 'requested',
        userId: USER_ID,
      });
      expect(sent(request)).toMatchObject({ method: 'DELETE', url: `${GRAPH}/users/${USER_ID}` });
      await expect(userActions.deleteUser.handler(ctx, { userId: USER_ID })).resolves.toMatchObject(
        {
          status: 'notFound',
        }
      );
    });
  });
});
