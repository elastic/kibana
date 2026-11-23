/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Idira } from './idira';
import { retryTiming } from './client';
import { UserIdInputSchema } from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });

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
