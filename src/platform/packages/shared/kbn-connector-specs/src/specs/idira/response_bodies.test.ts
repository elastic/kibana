/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { AccountIdInputSchema } from './types';
import { createContext, run, ACCOUNT } from './test_helpers';

/** A 2xx answer whose body is not the record an action returns is an error, never a success. */
describe('Idira Privilege Cloud connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getAccountDetails response body', () => {
    it.each([
      ['<html><head><title>Sign in</title></head></html>', 'an HTML page titled "Sign in"'],
      ['OK', 'the text "OK"'],
      ['', 'an empty body'],
      [{ name: 'x' }, 'a JSON body without an id'],
      [[ACCOUNT], 'a JSON body without an id'],
      [{ ...ACCOUNT, id: '' }, 'a JSON body without an id'],
    ])('fails on a 200 whose body is not an account record: %j', async (data, described) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run('getAccountDetails', ctx, { accountId: '12_3' })).rejects.toThrow(
        `Privilege Cloud answered GET /PasswordVault/API/Accounts/12_3 with HTTP 200 and ${described} instead of the account record (account 12_3).`
      );
    });
  });

  describe('addAccount response body', () => {
    it.each([
      [201, '<html><title>Portal</title></html>', 'an HTML page titled "Portal"'],
      [201, '', 'an empty body'],
      [200, { safeName: 'SOC-Servers' }, 'a JSON body without an id'],
    ])(
      'does not report an account for HTTP %s with a body that is not an account record (%j)',
      async (status, data, described) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status, data });

        await expect(
          run('addAccount', ctx, {
            safeName: 'SOC-Servers',
            platformId: 'WinServerLocal',
            secret: 'Initial-Canary-1',
          })
        ).rejects.toThrow(
          `Privilege Cloud answered POST /PasswordVault/API/Accounts with HTTP ${status} and ${described} instead of the new account record`
        );
      }
    );

    it('returns an id that getAccountDetails accepts', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 201, data: ACCOUNT });

      const created = await run('addAccount', ctx, {
        safeName: 'SOC-Servers',
        platformId: 'WinServerLocal',
      });
      expect(
        AccountIdInputSchema.safeParse({ accountId: (created as { id: unknown }).id }).success
      ).toBe(true);
    });
  });

  describe('updateAccount response body', () => {
    it.each([
      ['<html><title>Sign in</title></html>', 'an HTML page titled "Sign in"'],
      ['', 'an empty body'],
    ])('fails on a 200 whose body is not an account record: %j', async (data, described) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(
        run('updateAccount', ctx, {
          accountId: '12_3',
          operations: [{ op: 'replace', path: '/address', value: '10.0.0.6' }],
        })
      ).rejects.toThrow(
        `Privilege Cloud answered PATCH /PasswordVault/API/Accounts/12_3 with HTTP 200 and ${described} instead of the updated account record (account 12_3).`
      );
    });
  });

  describe('addSafeMember response body', () => {
    it('accepts an empty body with HTTP 204 too', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: undefined });

      await expect(
        run('addSafeMember', ctx, {
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'User',
          permissions: { listAccounts: true },
        })
      ).resolves.toMatchObject({ memberName: 'jsmith', added: true, alreadyMember: false });
    });

    it.each([
      [200, '<html><head><title>Sign in</title></head></html>', 'an HTML page titled "Sign in"'],
      [201, 'Created', 'the text "Created"'],
      [200, '', 'an empty body'],
      [201, [], 'a JSON body without a memberName'],
    ])(
      'does not report a grant for HTTP %s with a body that is not a member record (%j)',
      async (status, data, described) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status, data });

        await expect(
          run('addSafeMember', ctx, {
            safeName: 'SOC-Servers',
            memberName: 'jsmith',
            memberType: 'User',
            permissions: { listAccounts: true },
          })
        ).rejects.toThrow(
          `Privilege Cloud answered POST /PasswordVault/API/Safes/SOC-Servers/Members with HTTP ${status} and ${described} instead of the safe member record (safe SOC-Servers or member jsmith).`
        );
      }
    );
  });

  describe('write actions with an empty or JSON answer', () => {
    const ACCOUNT_ID = { accountId: '12_3' };
    const QUEUED = { accountId: '12_3', queued: true };
    const WRITES = [
      [
        'changeAccountPassword',
        ACCOUNT_ID,
        'POST',
        '/Accounts/12_3/Change',
        'account 12_3',
        QUEUED,
      ],
      [
        'reconcileAccountCredentials',
        ACCOUNT_ID,
        'POST',
        '/Accounts/12_3/Reconcile',
        'account 12_3',
        QUEUED,
      ],
      [
        'verifyAccountCredentials',
        ACCOUNT_ID,
        'POST',
        '/Accounts/12_3/Verify',
        'account 12_3',
        QUEUED,
      ],
      [
        'setAccountPassword',
        { ...ACCOUNT_ID, newCredentials: 'New-Canary-Value-1' },
        'POST',
        '/Accounts/12_3/SetNextPassword',
        'account 12_3',
        QUEUED,
      ],
      [
        'suspendUser',
        { userId: 101 },
        'POST',
        '/Users/101/disable',
        'vault user 101',
        { userId: 101, enabled: false },
      ],
      [
        'activateUser',
        { userId: 101 },
        'POST',
        '/Users/101/enable',
        'vault user 101',
        { userId: 101, enabled: true },
      ],
      [
        'removeSafeMember',
        { safeName: 'SOC-Servers', memberName: 'jsmith' },
        'DELETE',
        '/Safes/SOC-Servers/Members/jsmith',
        'member jsmith of safe SOC-Servers',
        { removed: true, alreadyAbsent: false },
      ],
    ] as const;

    it.each(WRITES)(
      '%s fails on HTTP 200 with an HTML page',
      async (name, input, method, path, target) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: '<html><title>Sign in</title></html>' });

        await expect(run(name, ctx, input)).rejects.toThrow(
          `Privilege Cloud answered ${method} /PasswordVault/API${path} with HTTP 200 and an HTML page titled "Sign in" instead of an empty or JSON answer (${target}).`
        );
      }
    );

    it.each(
      WRITES.flatMap(([name, input, , , , result]) => [
        [name, 200, '', input, result] as const,
        [name, 204, undefined, input, result] as const,
      ])
    )(
      '%s succeeds on HTTP %s with an empty body (%j)',
      async (name, status, data, input, result) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status, data });

        await expect(run(name, ctx, input)).resolves.toMatchObject(result);
      }
    );

    it.each([
      ['suspendUser', { userId: 101 }, { id: 101, enableUser: false }],
      ['changeAccountPassword', ACCOUNT_ID, true],
    ] as const)('%s succeeds on HTTP 200 with a JSON answer', async (name, input, data) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run(name, ctx, input)).resolves.toBeDefined();
    });

    it.each([
      ['New-Canary-Value-1', 'the text "Accepted [REDACTED]"'],
      ['abc1', 'the text "(message left out because it contains a value the call sent)"'],
    ])(
      'setAccountPassword never quotes the password %s from a text body',
      async (secret, described) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 200, data: `Accepted ${secret}` });

        const error = await run('setAccountPassword', ctx, {
          accountId: '12_3',
          newCredentials: secret,
        }).catch((e: Error) => e);
        expect((error as Error).message).toContain(`HTTP 200 and ${described} instead of`);
        expect((error as Error).message).not.toContain(secret);
      }
    );
  });
});
