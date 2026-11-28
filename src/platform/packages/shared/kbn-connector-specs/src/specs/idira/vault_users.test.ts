/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Idira } from './idira';
import { UserIdInputSchema } from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('vault users', () => {
    it.each([
      ['suspendUser', 'disable', false],
      ['activateUser', 'enable', true],
    ] as const)('%s posts to /Users/{id}/%s', async (name, route, enabled) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await expect(run(name, ctx, { userId: 42 })).resolves.toEqual({ userId: 42, enabled });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Users/42/${route}`,
        params: undefined,
        data: undefined,
      });
    });

    it.each([403, 404])('explains that a %s can mean an Identity-managed user', async (status) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(status));

      await expect(run('suspendUser', ctx, { userId: 42 })).rejects.toThrow(
        'Identity Administration'
      );
    });

    it('explains the 403 and 404 answers for Identity-managed users in both descriptions', () => {
      expect(Idira.actions.suspendUser.description).toContain('answer 403 or 404');
      expect(Idira.actions.activateUser.description).toContain('answer 403 or 404');
    });

    it.each([
      [42, true],
      [0, false],
      [-1, false],
      [1.5, false],
      ['42', false],
    ])('userId %p -> %s', (userId, valid) => {
      expect(UserIdInputSchema.safeParse({ userId }).success).toBe(valid);
    });
  });

  describe('getVaultUser', () => {
    const USER = {
      id: 42,
      username: 'jdoe',
      source: 'CyberArk',
      userType: 'EPVUser',
      componentUser: false,
      location: '\\',
      vaultAuthorization: [],
      authenticationMethod: ['AuthTypePass'],
      enableUser: false,
      suspended: false,
    };

    it('gets /Users/{id} and returns the record as the API sends it', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: USER });

      await expect(run('getVaultUser', ctx, { userId: 42 })).resolves.toEqual({
        ...USER,
        enabled: false,
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Users/42`,
        params: undefined,
        data: undefined,
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['enableUser true', { enableUser: true }, true],
      ['enableUser false', { enableUser: false }, false],
      ['enabled true only', { enabled: true }, true],
      ['enabled false only', { enabled: false }, false],
      ['enableUser before enabled', { enableUser: false, enabled: true }, false],
      ['a non-boolean enableUser, then enabled', { enableUser: 'yes', enabled: true }, true],
      ['neither field', {}, null],
    ])('sets enabled from %s', async (_label, state, enabled) => {
      const { ctx, request } = createContext();
      const rest: Record<string, unknown> = { ...USER };
      delete rest.enableUser;
      request.mockResolvedValue({ status: 200, data: { ...rest, ...state } });

      const user = await run('getVaultUser', ctx, { userId: 42 });
      expect(user).toMatchObject({ ...state, enabled });
    });

    it('reads back the state that suspendUser set, by the userId it returned', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 200, data: '' })
        .mockResolvedValueOnce({ status: 200, data: USER });

      const suspended = (await run('suspendUser', ctx, { userId: 42 })) as { userId: number };
      const user = (await run('getVaultUser', ctx, { userId: suspended.userId })) as typeof USER;
      expect(user.enableUser).toBe(false);
      expect((user as unknown as { enabled: boolean }).enabled).toBe(false);
      expect(sent(request, 1).url).toBe(`${BASE}/Users/42`);
    });

    it('uses the same user ID check as suspendUser and activateUser', () => {
      expect(Idira.actions.getVaultUser.input).toBe(Idira.actions.suspendUser.input);
      expect(Idira.actions.getVaultUser.input).toBe(Idira.actions.activateUser.input);
    });

    it('is an agent tool with scope read that confirms a disable or enable', () => {
      const action = Idira.actions.getVaultUser;
      expect(action.isTool).toBe(true);
      expect(action.scope).toBe('read');
      expect(action.description).toContain('confirm that a vault user was disabled or enabled');
      expect(action.description).toContain('enableUser');
      expect(action.description).toContain('Audit users');
    });

    it('fails with a not-found error naming the user', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404, { ErrorCode: 'PASWS005E' }));

      await expect(run('getVaultUser', ctx, { userId: 999 })).rejects.toThrow(
        'Not found: vault user 999'
      );
    });

    it('names the Audit users authorization on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(run('getVaultUser', ctx, { userId: 42 })).rejects.toThrow(
        'The service user lacks the Audit users vault authorization.'
      );
    });

    it.each([
      ['<html><title>Sign in</title></html>', 'an HTML page titled "Sign in"'],
      ['', 'an empty body'],
      [{ username: 'jdoe' }, 'a JSON body without an id'],
    ])('fails on a 200 whose body is not a user record: %j', async (data, described) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run('getVaultUser', ctx, { userId: 42 })).rejects.toThrow(
        `Privilege Cloud answered GET /PasswordVault/API/Users/42 with HTTP 200 and ${described} instead of the vault user record (vault user 42).`
      );
    });
  });

  describe('repeat calls and unknown users', () => {
    it.each([
      ['suspendUser', 'disable', false],
      ['activateUser', 'enable', true],
    ] as const)(
      '%s called twice posts /%s again and returns the same state',
      async (name, route, enabled) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: '' });

        const first = await run(name, ctx, { userId: 42 });
        const second = await run(name, ctx, { userId: 42 });
        expect(first).toEqual({ userId: 42, enabled });
        expect(second).toEqual(first);
        expect(request).toHaveBeenCalledTimes(2);
        expect(sent(request, 1).url).toBe(`${BASE}/Users/42/${route}`);
      }
    );

    it('activateUser of an unknown user fails with a not-found error naming the user, after one request', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404));

      await expect(run('activateUser', ctx, { userId: 999 })).rejects.toThrow('vault user 999');
      expect(request).toHaveBeenCalledTimes(1);
    });
  });
});
