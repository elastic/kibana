/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { authMethodActions, methodTypeOf } from './auth_method_actions';
import { retryTiming } from './graph_client';
import { DeleteAuthMethodInputSchema } from './types';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const USER_ID = '6e7b768e-07e2-4810-8459-485f84f8f204';
const BASE = `${GRAPH}/users/${USER_ID}/authentication`;

const graphError = (status: number, message = 'Graph error') =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { error: { code: 'Code', message } }, headers: {} },
  });

// The shape Graph sent live for an unknown FIDO2 key id: a directory error as a JSON string.
const DIRECTORY_KEY_NOT_FOUND = JSON.stringify({
  'odata.error': {
    code: 'directory_error',
    message: {
      lang: 'en',
      value: `A key with identifier 'k1' was not found for user '${USER_ID}'`,
    },
    values: [{ item: 'subCode', value: 'error_key_not_found' }],
  },
});

const method = (type: string, id: string) => ({
  '@odata.type': `#microsoft.graph.${type}AuthenticationMethod`,
  id,
});

const makeContext = () => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: {},
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('Microsoft Entra ID authentication method actions', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it.each([
    ['#microsoft.graph.fido2AuthenticationMethod', 'fido2'],
    ['#microsoft.graph.passwordAuthenticationMethod', 'password'],
    ['#microsoft.graph.microsoftAuthenticatorAuthenticationMethod', 'microsoftAuthenticator'],
    ['#microsoft.graph.temporaryAccessPassAuthenticationMethod', 'temporaryAccessPass'],
    [undefined, 'unknown'],
  ])('derives methodType from %s', (odataType, expected) => {
    expect(methodTypeOf(odataType)).toBe(expected);
  });

  describe('getUserAuthMethods', () => {
    it('lists the methods with their methodType', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        data: {
          value: [method('password', 'p1'), { ...method('phone', 'ph1'), phoneType: 'mobile' }],
        },
      });
      const result = await authMethodActions.getUserAuthMethods.handler(ctx, { userId: USER_ID });
      expect(request.mock.calls[0][0]).toMatchObject({ method: 'GET', url: `${BASE}/methods` });
      expect(result).toEqual({
        found: true,
        userId: USER_ID,
        value: [
          { ...method('password', 'p1'), methodType: 'password' },
          { ...method('phone', 'ph1'), phoneType: 'mobile', methodType: 'phone' },
        ],
      });
    });

    it('returns found false for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(
        authMethodActions.getUserAuthMethods.handler(ctx, { userId: USER_ID })
      ).resolves.toEqual({ found: false, userId: USER_ID, value: [] });
    });

    it('returns found false when Graph cannot resolve the id as a user (400 on userPrincipalName)', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(
        graphError(
          400,
          "Unsupported or invalid query filter clause specified for property 'userPrincipalName' of resource 'User'."
        )
      );
      await expect(
        authMethodActions.getUserAuthMethods.handler(ctx, {
          userId: '00000000-0000-0000-0000-000000000000',
        })
      ).resolves.toEqual({
        found: false,
        userId: '00000000-0000-0000-0000-000000000000',
        value: [],
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('fails with the Graph message for any other 400', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(400, 'Invalid request'));
      await expect(
        authMethodActions.getUserAuthMethods.handler(ctx, { userId: USER_ID })
      ).rejects.toThrow(
        /getUserAuthMethods failed: Microsoft Graph rejected the request \(Code\): Invalid request/
      );
    });
  });

  describe('deleteAuthMethod', () => {
    it.each([
      ['fido2', 'fido2Methods'],
      ['microsoftAuthenticator', 'microsoftAuthenticatorMethods'],
      ['temporaryAccessPass', 'temporaryAccessPassMethods'],
      ['windowsHelloForBusiness', 'windowsHelloForBusinessMethods'],
    ] as const)('deletes a %s method from its collection', async (methodType, collection) => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await authMethodActions.deleteAuthMethod.handler(ctx, {
        userId: USER_ID,
        methodType,
        methodId: 'abc/def==',
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'DELETE',
        url: `${BASE}/${collection}/abc%2Fdef%3D%3D`,
      });
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        methodType,
        methodId: 'abc/def==',
      });
    });

    it('refuses the password method type at the schema', () => {
      expect(
        DeleteAuthMethodInputSchema.safeParse({
          userId: USER_ID,
          methodType: 'password',
          methodId: 'x',
        }).success
      ).toBe(false);
    });

    it('returns notFound for a method that is gone', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, 'not found'));
      await expect(
        authMethodActions.deleteAuthMethod.handler(ctx, {
          userId: USER_ID,
          methodType: 'phone',
          methodId: 'x',
        })
      ).resolves.toMatchObject({ status: 'notFound', message: 'not found' });
    });

    it('returns notFound with the plain Graph text when the error message is a directory error JSON string', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, DIRECTORY_KEY_NOT_FOUND));
      const result = await authMethodActions.deleteAuthMethod.handler(ctx, {
        userId: USER_ID,
        methodType: 'fido2',
        methodId: 'k1',
      });
      expect(result).toEqual({
        status: 'notFound',
        userId: USER_ID,
        methodType: 'fido2',
        methodId: 'k1',
        message: `A key with identifier 'k1' was not found for user '${USER_ID}'`,
      });
    });

    it('surfaces the default phone method refusal', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(400, 'cannot delete the default method'));
      await expect(
        authMethodActions.deleteAuthMethod.handler(ctx, {
          userId: USER_ID,
          methodType: 'phone',
          methodId: 'x',
        })
      ).rejects.toThrow(/rejected the request \(Code\): cannot delete the default method/);
    });
  });

  describe('resetUserMfa', () => {
    it('keeps the password, removes the others with phones last, and reports each list', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({
          data: {
            value: [
              method('password', 'pw'),
              method('phone', 'ph'),
              method('fido2', 'fk'),
              method('platformCredential', 'pc'),
              method('microsoftAuthenticator', 'ma'),
            ],
          },
        })
        .mockResolvedValue({ status: 204 });
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      const deleted = request.mock.calls.slice(1).map((c) => c[0].url);
      expect(deleted).toEqual([
        `${BASE}/fido2Methods/fk`,
        `${BASE}/microsoftAuthenticatorMethods/ma`,
        `${BASE}/phoneMethods/ph`,
      ]);
      expect(result).toEqual({
        status: 'requested',
        userId: USER_ID,
        removed: [
          { id: 'fk', methodType: 'fido2' },
          { id: 'ma', methodType: 'microsoftAuthenticator' },
          { id: 'ph', methodType: 'phone' },
        ],
        failed: [],
        skipped: [
          { id: 'pw', methodType: 'password', reason: 'the password method cannot be removed' },
          {
            id: 'pc',
            methodType: 'platformCredential',
            reason: 'this method type cannot be removed by this action',
          },
        ],
        removedCount: 3,
        failedCount: 0,
      });
    });

    it('lists a refused deletion in failed and keeps going', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({ data: { value: [method('phone', 'ph'), method('email', 'em')] } })
        .mockResolvedValueOnce({ status: 204 })
        .mockRejectedValueOnce(graphError(400, 'default method'));
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      expect(result).toMatchObject({
        status: 'requested',
        removed: [{ id: 'em', methodType: 'email' }],
        failed: [{ id: 'ph', methodType: 'phone', status: 400 }],
        removedCount: 1,
        failedCount: 1,
      });
      expect((result as { failed: Array<{ message: string }> }).failed[0].message).toContain(
        'default method'
      );
    });

    it('gives a failed deletion the plain Graph text when the error message is a directory error JSON string', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({ data: { value: [method('email', 'em'), method('fido2', 'k1')] } })
        .mockResolvedValueOnce({ status: 204 })
        .mockRejectedValueOnce(graphError(400, DIRECTORY_KEY_NOT_FOUND));
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      expect(result).toMatchObject({
        status: 'requested',
        removed: [{ id: 'em', methodType: 'email' }],
        failed: [
          {
            id: 'k1',
            methodType: 'fido2',
            status: 400,
            message: `Removing fido2 method failed: Microsoft Graph rejected the request (Code): A key with identifier 'k1' was not found for user '${USER_ID}'`,
          },
        ],
      });
    });

    it('counts a method removed meanwhile as skipped', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({ data: { value: [method('email', 'em'), method('fido2', 'fk')] } })
        .mockRejectedValueOnce(graphError(404))
        .mockResolvedValueOnce({ status: 204 });
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      expect(result).toMatchObject({
        status: 'requested',
        removed: [{ id: 'fk', methodType: 'fido2' }],
        skipped: [{ id: 'em', methodType: 'email', reason: 'already removed' }],
      });
    });

    it('fails when every deletion fails', async () => {
      const { ctx, request } = makeContext();
      request
        .mockResolvedValueOnce({ data: { value: [method('email', 'em')] } })
        .mockRejectedValueOnce(graphError(403, 'denied'));
      await expect(
        authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID })
      ).rejects.toThrow(/no method could be removed\. email em: .*access denied/);
    });

    it('returns skipped when only the password is registered', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValueOnce({ data: { value: [method('password', 'pw')] } });
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      expect(result).toMatchObject({ status: 'skipped', removedCount: 0, failedCount: 0 });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('fails with the Graph message when the method list is refused, and deletes nothing', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(403, 'Insufficient privileges'));
      await expect(
        authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID })
      ).rejects.toThrow(/resetUserMfa failed: access denied \(Code\): Insufficient privileges/);
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('returns notFound for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, 'no user'));
      await expect(
        authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID })
      ).resolves.toEqual({ status: 'notFound', userId: USER_ID, message: 'no user' });
    });

    it('returns notFound and deletes nothing when Graph cannot resolve the id as a user', async () => {
      const { ctx, request } = makeContext();
      const message =
        "Unsupported or invalid query filter clause specified for property 'userPrincipalName' of resource 'User'.";
      request.mockRejectedValue(graphError(400, message));
      await expect(
        authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID })
      ).resolves.toEqual({ status: 'notFound', userId: USER_ID, message });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('stops deleting when the time budget runs out and says to run again', async () => {
      const { ctx, request } = makeContext();
      let now = 0;
      jest.spyOn(retryTiming, 'now').mockImplementation(() => now);
      request
        .mockResolvedValueOnce({ data: { value: [method('email', 'em'), method('fido2', 'fk')] } })
        .mockImplementationOnce(async () => {
          now = 120_000;
          return { status: 204 };
        });
      const result = await authMethodActions.resetUserMfa.handler(ctx, { userId: USER_ID });
      expect(result).toMatchObject({
        status: 'requested',
        removed: [{ id: 'em' }],
        skipped: [{ id: 'fk', reason: 'time limit reached; run resetUserMfa again' }],
      });
      expect(request).toHaveBeenCalledTimes(2);
    });
  });
});
