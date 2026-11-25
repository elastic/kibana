/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withoutBookkeeping } from './client';
import { DIRECTORY, USER, accepts, createContext, googleError, run, sent } from './test_helpers';

const TOKEN = {
  kind: 'admin#directory#token',
  etag: '"t"',
  clientId: '123-abc.apps.googleusercontent.com',
  displayText: 'Example App',
  scopes: ['https://www.googleapis.com/auth/drive'],
  userKey: '104512345678901234567',
  anonymous: false,
  nativeApp: false,
};

const ASP = {
  kind: 'admin#directory#asp',
  etag: '"a"',
  codeId: 42,
  name: 'Mail client',
  creationTime: '1700000000000',
  lastTimeUsed: '1710000000000',
  userKey: '104512345678901234567',
};

const notFound = () => googleError(404, 'Resource Not Found', 'notFound');

describe('Google Workspace Admin account security actions', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listUserTokens', () => {
    it('returns the grants without kind and etag', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { kind: 'x', items: [TOKEN] } });
      const result = await run('listUserTokens', ctx, { userKey: 'jdoe@example.com' });
      expect(sent(request).url).toBe(`${DIRECTORY}/users/jdoe%40example.com/tokens`);
      const expected = withoutBookkeeping(TOKEN);
      expect(result).toEqual({ items: [expected] });
    });

    it('returns an empty list when Google omits items', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { kind: 'admin#directory#tokenList' } });
      expect(await run('listUserTokens', ctx, { userKey: 'jdoe@example.com' })).toEqual({
        items: [],
      });
    });
  });

  describe('revokeUserToken', () => {
    const input = { userKey: 'jdoe@example.com', clientId: TOKEN.clientId };

    it('deletes the grant and reports revoked', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      expect(await run('revokeUserToken', ctx, input)).toEqual({ ...input, status: 'revoked' });
      expect(sent(request)).toEqual({
        method: 'DELETE',
        url: `${DIRECTORY}/users/jdoe%40example.com/tokens/123-abc.apps.googleusercontent.com`,
        params: undefined,
        data: undefined,
      });
    });

    it('reports notFound with the same keys when the user exists but has no such grant', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(notFound()).mockResolvedValueOnce({ status: 200, data: USER });
      expect(await run('revokeUserToken', ctx, input)).toEqual({ ...input, status: 'notFound' });
      expect(sent(request, 1)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/users/jdoe%40example.com`,
        params: { projection: 'basic' },
        data: undefined,
      });
    });

    it('fails with User not found when the user does not exist', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(notFound());
      await expect(run('revokeUserToken', ctx, input)).rejects.toThrow(
        'User jdoe@example.com not found'
      );
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('raises the lookup error itself when the user read fails for another reason', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(notFound())
        .mockRejectedValueOnce(
          googleError(403, 'Not Authorized to access this resource/api', 'forbidden')
        );
      await expect(run('revokeUserToken', ctx, input)).rejects.toThrow(
        'The authorized account lacks the scope or admin privilege for this action: Not Authorized to access this resource/api.'
      );
    });

    it('does not read the user after a failure other than 404', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(403, 'Forbidden', 'forbidden'));
      await expect(run('revokeUserToken', ctx, input)).rejects.toThrow('lacks the scope');
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports notFound on a repeated revoke of the same grant', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 204, data: '' })
        .mockRejectedValueOnce(notFound())
        .mockResolvedValueOnce({ status: 200, data: USER });
      expect((await run('revokeUserToken', ctx, input)).status).toBe('revoked');
      expect((await run('revokeUserToken', ctx, input)).status).toBe('notFound');
    });

    it('rejects a client ID with a path separator before any request', () => {
      expect(accepts('revokeUserToken', { userKey: 'a@example.com', clientId: '../users' })).toBe(
        false
      );
    });

    it.each([
      ['revokeUserToken', { userKey: 'a@example.com', clientId: '..' }],
      ['revokeUserToken', { userKey: 'a@example.com', clientId: '.' }],
      ['revokeUserToken', { userKey: '..', clientId: 'client-1' }],
      ['revokeAppPasswords', { userKey: '.', codeId: 1 }],
      ['signOutUser', { userKey: '..' }],
    ] as const)('rejects the dot segment in %s %j before any request', (name, actionInput) => {
      expect(accepts(name, actionInput)).toBe(false);
    });
  });

  describe('listAppPasswords and revokeAppPasswords', () => {
    it('lists app passwords without kind and etag', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { items: [ASP] } });
      const result = await run('listAppPasswords', ctx, { userKey: 'jdoe@example.com' });
      expect(sent(request).url).toBe(`${DIRECTORY}/users/jdoe%40example.com/asps`);
      const expected = withoutBookkeeping(ASP);
      expect(result).toEqual({ items: [expected] });
    });

    it('deletes one app password by code ID', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      expect(
        await run('revokeAppPasswords', ctx, { userKey: 'jdoe@example.com', codeId: 42 })
      ).toEqual({ userKey: 'jdoe@example.com', codeId: 42, status: 'revoked' });
      expect(sent(request).method).toBe('DELETE');
      expect(sent(request).url).toBe(`${DIRECTORY}/users/jdoe%40example.com/asps/42`);
    });

    it('reports notFound for an unknown code ID of an existing user', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValueOnce(notFound()).mockResolvedValueOnce({ status: 200, data: USER });
      expect(
        await run('revokeAppPasswords', ctx, { userKey: 'jdoe@example.com', codeId: 7 })
      ).toEqual({ userKey: 'jdoe@example.com', codeId: 7, status: 'notFound' });
    });

    it('fails for an unknown user', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(notFound());
      await expect(
        run('revokeAppPasswords', ctx, { userKey: 'nobody@example.com', codeId: 7 })
      ).rejects.toThrow('User nobody@example.com not found');
    });

    it('raises the user read error itself when that read fails for another reason', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(notFound())
        .mockRejectedValueOnce(googleError(403, 'Not Authorized', 'forbidden'));
      await expect(
        run('revokeAppPasswords', ctx, { userKey: 'jdoe@example.com', codeId: 7 })
      ).rejects.toThrow('lacks the scope or admin privilege for this action: Not Authorized.');
    });

    it('reports notFound on a repeated revoke of the same app password', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 204, data: '' })
        .mockRejectedValueOnce(notFound())
        .mockResolvedValueOnce({ status: 200, data: USER });
      const input = { userKey: 'jdoe@example.com', codeId: 42 };
      expect((await run('revokeAppPasswords', ctx, input)).status).toBe('revoked');
      expect((await run('revokeAppPasswords', ctx, input)).status).toBe('notFound');
    });

    it('reports notFound when Google rejects an unknown code ID with 400 and the list lacks it', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(400, 'Invalid Input'))
        .mockResolvedValueOnce({ status: 200, data: { items: [{ ...ASP, codeId: 42 }] } });
      expect(
        await run('revokeAppPasswords', ctx, { userKey: 'jdoe@example.com', codeId: 7 })
      ).toEqual({ userKey: 'jdoe@example.com', codeId: 7, status: 'notFound' });
      expect(sent(request, 1)).toMatchObject({
        method: 'GET',
        url: `${DIRECTORY}/users/jdoe%40example.com/asps`,
      });
    });

    it('raises the 400 when the code ID is still listed', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(400, 'Invalid Input'))
        .mockResolvedValueOnce({ status: 200, data: { items: [{ ...ASP, codeId: 7 }] } });
      await expect(
        run('revokeAppPasswords', ctx, { userKey: 'jdoe@example.com', codeId: 7 })
      ).rejects.toThrow('Google rejected the request: Invalid Input.');
    });

    it('fails for an unknown user after a 400', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(400, 'Invalid Input'))
        .mockRejectedValue(notFound());
      await expect(
        run('revokeAppPasswords', ctx, { userKey: 'nobody@example.com', codeId: 7 })
      ).rejects.toThrow('User nobody@example.com not found');
    });

    it.each([-1, 1.5, 2147483648])('rejects code ID %s before any request', (codeId) => {
      expect(accepts('revokeAppPasswords', { userKey: 'a@example.com', codeId })).toBe(false);
    });
  });

  describe('listVerificationCodes', () => {
    it('returns the count and owner of each code, never the code values', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: {
          kind: 'admin#directory#verificationCodesList',
          items: [
            { kind: 'k', etag: 'e', userId: USER.id, verificationCode: '90817263' },
            { kind: 'k', etag: 'e', userId: USER.id, verificationCode: '55443322' },
          ],
        },
      });
      const result = await run('listVerificationCodes', ctx, { userKey: 'jdoe@example.com' });
      expect(sent(request).url).toBe(`${DIRECTORY}/users/jdoe%40example.com/verificationCodes`);
      expect(result).toEqual({ count: 2, items: [{ userId: USER.id }, { userId: USER.id }] });
      expect(JSON.stringify(result)).not.toMatch(/90817263|55443322|verificationCode/);
    });

    it('returns count 0 when the user has no valid codes', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      expect(await run('listVerificationCodes', ctx, { userKey: 'jdoe@example.com' })).toEqual({
        count: 0,
        items: [],
      });
    });
  });

  describe('invalidateVerificationCodes', () => {
    it('posts the invalidation and reports invalidated', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      expect(
        await run('invalidateVerificationCodes', ctx, { userKey: 'jdoe@example.com' })
      ).toEqual({ userKey: 'jdoe@example.com', invalidated: true });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${DIRECTORY}/users/jdoe%40example.com/verificationCodes/invalidate`,
        params: undefined,
        data: undefined,
      });
    });

    it('succeeds again on a repeated invalidation', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      await run('invalidateVerificationCodes', ctx, { userKey: 'jdoe@example.com' });
      expect(
        await run('invalidateVerificationCodes', ctx, { userKey: 'jdoe@example.com' })
      ).toEqual({ userKey: 'jdoe@example.com', invalidated: true });
    });

    it('succeeds when Google answers 400 and the user has no valid codes left', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 204, data: '' })
        .mockRejectedValueOnce(googleError(400, 'Invalid Input'))
        .mockResolvedValueOnce({ status: 200, data: {} });
      const input = { userKey: 'jdoe@example.com' };
      const expected = { userKey: 'jdoe@example.com', invalidated: true };
      expect(await run('invalidateVerificationCodes', ctx, input)).toEqual(expected);
      expect(await run('invalidateVerificationCodes', ctx, input)).toEqual(expected);
      expect(sent(request, 2)).toMatchObject({
        method: 'GET',
        url: `${DIRECTORY}/users/jdoe%40example.com/verificationCodes`,
      });
    });

    it('raises the 400 when valid codes remain', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(400, 'Invalid Input'))
        .mockResolvedValueOnce({ status: 200, data: { items: [{ userId: USER.id }] } });
      await expect(
        run('invalidateVerificationCodes', ctx, { userKey: 'jdoe@example.com' })
      ).rejects.toThrow('Google rejected the request: Invalid Input.');
    });

    it('surfaces a 412 from Google as an error', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(412, 'Precondition failed', 'conditionNotMet'));
      await expect(
        run('invalidateVerificationCodes', ctx, { userKey: 'jdoe@example.com' })
      ).rejects.toThrow('Google Workspace error 412: Precondition failed (conditionNotMet).');
      expect(request).toHaveBeenCalledTimes(1);
    });
  });
});
