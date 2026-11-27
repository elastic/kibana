/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { retryTiming } from './client';
import { Idira } from './idira';
import { ChangeAccountPasswordInputSchema, SetAccountPasswordInputSchema } from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('CPM operations', () => {
    it('changeAccountPassword posts to /Change with ChangeEntireGroup false by default and returns queued', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await expect(run('changeAccountPassword', ctx, { accountId: '12_3' })).resolves.toEqual({
        accountId: '12_3',
        queued: true,
      });
      // Omitted, the vendor default would rotate every account in the account group.
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Accounts/12_3/Change`,
        params: undefined,
        // Both names the vendor docs use, with the same value.
        data: { ChangeEntireGroup: false, ChangeCredsForGroup: false },
      });
    });

    it('says in the action and field descriptions that only this account changes by default', () => {
      const action = Idira.actions.changeAccountPassword;
      expect(action.description).toContain(
        'Changes only this account unless changeEntireGroup is true'
      );
      expect(action.description).toContain(
        'Accounts in an account group share one credential: to contain a compromised grouped credential, set changeEntireGroup to true'
      );
      const field = ChangeAccountPasswordInputSchema.shape.changeEntireGroup.description ?? '';
      expect(field).toContain('Defaults to false: only this account changes');
    });

    it.each([true, false])(
      'changeAccountPassword sends ChangeEntireGroup and ChangeCredsForGroup %s when set',
      async (changeEntireGroup) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: '' });

        await run('changeAccountPassword', ctx, { accountId: '12_3', changeEntireGroup });
        expect(request.mock.calls[0][0].data).toEqual({
          ChangeEntireGroup: changeEntireGroup,
          ChangeCredsForGroup: changeEntireGroup,
        });
      }
    );

    it.each([
      ['reconcileAccountCredentials', 'Reconcile'],
      ['verifyAccountCredentials', 'Verify'],
    ] as const)('%s posts to /%s and returns queued', async (name, operation) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await expect(run(name, ctx, { accountId: '12_3' })).resolves.toEqual({
        accountId: '12_3',
        queued: true,
      });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Accounts/12_3/${operation}`,
        params: undefined,
        data: undefined,
      });
    });

    it('names the CPM permission on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(run('reconcileAccountCredentials', ctx, { accountId: '12_3' })).rejects.toThrow(
        'Initiate CPM account management operations'
      );
    });

    it('does not retry a CPM operation after a gateway error, so it is never queued twice', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(504));

      const error = await run('changeAccountPassword', ctx, { accountId: '12_3' }).catch((e) => e);
      expect(error.message).toContain('Privilege Cloud error 504');
      expect(error.message).toContain(
        'Privilege Cloud may have applied the change: check the current state before you run the action again.'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('retries a rate-limited CPM operation, which was not queued, and reports the wait when it persists', async () => {
      const sleep = jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(429, {}, { 'retry-after': '30' }));

      await expect(run('verifyAccountCredentials', ctx, { accountId: '12_3' })).rejects.toThrow(
        'Still rate limited after 2 attempts. Privilege Cloud asks to wait 30 s before the next request (Retry-After).'
      );
      expect(request).toHaveBeenCalledTimes(2);
      expect(sleep).toHaveBeenCalledWith(30_000);
    });

    it('queues a CPM operation once the rate limit clears', async () => {
      jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(httpError(429))
        .mockResolvedValueOnce({ status: 200, data: '' });

      await expect(run('changeAccountPassword', ctx, { accountId: '12_3' })).resolves.toEqual({
        accountId: '12_3',
        queued: true,
      });
      expect(request).toHaveBeenCalledTimes(2);
    });
  });

  describe('setAccountPassword', () => {
    const CANARY = 'Canary-Secret-9d41!';

    it('sends NewCredentials and ChangeImmediately in the body and never returns the password', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      const result = await run('setAccountPassword', ctx, {
        accountId: '12_3',
        newCredentials: CANARY,
        changeImmediately: true,
      });

      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Accounts/12_3/SetNextPassword`,
        params: undefined,
        data: { NewCredentials: CANARY, ChangeImmediately: true },
      });
      expect(result).toEqual({ accountId: '12_3', queued: true });
      expect(JSON.stringify(result)).not.toContain(CANARY);
    });

    it('omits ChangeImmediately when not set', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });

      await run('setAccountPassword', ctx, { accountId: '12_3', newCredentials: CANARY });
      expect(request.mock.calls[0][0].data).toEqual({ NewCredentials: CANARY });
    });

    it('keeps the password out of errors and logs, even when the vendor echoes it', async () => {
      const { ctx, request, debug } = createContext();
      request
        .mockRejectedValueOnce(
          httpError(400, { ErrorCode: 'PASWS013E', ErrorMessage: `${CANARY} violates the policy` })
        )
        .mockRejectedValueOnce(
          httpError(503, { ErrorCode: 'PASWS500E', ErrorMessage: `${CANARY} was not stored` })
        );

      const rejected = await run('setAccountPassword', ctx, {
        accountId: '12_3',
        newCredentials: CANARY,
      }).catch((e) => e);
      const failed = await run('setAccountPassword', ctx, {
        accountId: '12_3',
        newCredentials: CANARY,
      }).catch((e) => e);

      expect(rejected.message).toContain('Privilege Cloud rejected the request');
      expect(failed.message).toContain('Privilege Cloud may have applied the change');
      for (const error of [rejected, failed]) {
        expect(error.message).toContain('[REDACTED]');
        expect(error.message).not.toContain(CANARY);
      }
      expect(JSON.stringify(debug.mock.calls)).not.toContain(CANARY);
    });

    it.each([
      ['x'.repeat(128), true],
      ['x'.repeat(129), false],
      ['', false],
    ])('newCredentials of length %#', (newCredentials, valid) => {
      expect(
        SetAccountPasswordInputSchema.safeParse({ accountId: '12_3', newCredentials }).success
      ).toBe(valid);
    });
  });

  describe('repeat calls', () => {
    it.each([
      ['changeAccountPassword', 'Change'],
      ['reconcileAccountCredentials', 'Reconcile'],
      ['verifyAccountCredentials', 'Verify'],
    ] as const)(
      '%s called twice queues /%s again and returns the same result',
      async (name, operation) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: '' });

        const first = await run(name, ctx, { accountId: '12_3' });
        const second = await run(name, ctx, { accountId: '12_3' });
        expect(first).toEqual({ accountId: '12_3', queued: true });
        expect(second).toEqual(first);
        expect(request).toHaveBeenCalledTimes(2);
        expect(sent(request, 1).url).toBe(`${BASE}/Accounts/12_3/${operation}`);
      }
    );

    it('setAccountPassword called twice sends the value again and never returns it', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: '' });
      const input = { accountId: '12_3', newCredentials: 'Repeat-Canary-7f2e!' };

      const first = await run('setAccountPassword', ctx, input);
      const second = await run('setAccountPassword', ctx, input);
      expect(second).toEqual(first);
      expect(second).toEqual({ accountId: '12_3', queued: true });
      expect(request).toHaveBeenCalledTimes(2);
      expect(sent(request, 1).data).toEqual({ NewCredentials: 'Repeat-Canary-7f2e!' });
      expect(JSON.stringify([first, second])).not.toContain('Repeat-Canary-7f2e!');
    });
  });
});
