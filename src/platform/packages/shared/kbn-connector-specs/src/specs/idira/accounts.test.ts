/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { retryTiming } from './client';
import {
  AccountIdInputSchema,
  AddAccountInputSchema,
  ListAccountsInputSchema,
  UpdateAccountInputSchema,
} from './types';
import { BASE, httpError, createContext, run, sent, ACCOUNT } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listAccounts', () => {
    it('sends search, the combined filter, savedfilter, sort and paging as query parameters', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({
        status: 200,
        data: { value: [ACCOUNT], count: 120, nextLink: 'api/accounts?offset=60&limit=10' },
      });

      const result = await run('listAccounts', ctx, {
        search: 'svc-backup 10.0.0.5',
        searchType: 'startswith',
        safeName: 'SOC-Servers',
        platformId: 'WinServerLocal',
        filter: 'modificationTime gte 1700000000',
        savedFilter: 'Recently',
        sort: 'userName asc',
        offset: 50,
        limit: 10,
      });

      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Accounts`,
        data: undefined,
        params: {
          search: 'svc-backup 10.0.0.5',
          searchType: 'startswith',
          filter:
            'safeName eq SOC-Servers AND platformId eq WinServerLocal AND modificationTime gte 1700000000',
          savedfilter: 'Recently',
          sort: 'userName asc',
          offset: 50,
          limit: 10,
        },
      });
      expect(result).toEqual({
        value: [ACCOUNT],
        count: 120,
        nextLink: 'api/accounts?offset=60&limit=10',
        nextOffset: 60,
      });
    });

    it('uses offset 0 and the vendor default page size of 50', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await expect(run('listAccounts', ctx, {})).resolves.toEqual({ value: [], count: 0 });
      expect(request.mock.calls[0][0].params).toEqual({
        search: undefined,
        searchType: undefined,
        filter: undefined,
        savedfilter: undefined,
        sort: undefined,
        offset: 0,
        limit: 50,
      });
    });

    it('reads the next pages by offset, never by requesting the nextLink', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({
          status: 200,
          data: { value: [ACCOUNT], count: 2, nextLink: '//evil.example/api/accounts?offset=1' },
        })
        .mockResolvedValueOnce({ status: 200, data: { value: [{ id: '12_4' }], count: 2 } });

      const first = await run('listAccounts', ctx, { limit: 1 });
      expect(first).toMatchObject({ nextOffset: 1 });
      const second = await run('listAccounts', ctx, { limit: 1, offset: 1 });
      expect(second).toEqual({ value: [{ id: '12_4' }], count: 2 });

      expect(request).toHaveBeenCalledTimes(2);
      for (const [config] of request.mock.calls) {
        expect(config.url).toBe(`${BASE}/Accounts`);
      }
      expect(request.mock.calls[1][0].params.offset).toBe(1);
    });

    it('names the missing permission on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403, { ErrorCode: 'ITATS629E' }));

      await expect(run('listAccounts', ctx, {})).rejects.toThrow(
        'The service user lacks the List accounts permission on the safe.'
      );
    });

    describe('input bounds', () => {
      const parse = (input: unknown) => ListAccountsInputSchema.safeParse(input).success;

      it.each([
        [{ limit: 1000 }, true],
        [{ limit: 1001 }, false],
        [{ limit: 0 }, false],
        [{ offset: -1 }, false],
        [{ search: 'x'.repeat(500) }, true],
        [{ search: 'x'.repeat(501) }, false],
        [{ filter: 'x'.repeat(501) }, false],
        [{ savedFilter: 'FailedChange' }, true],
        [{ savedFilter: 'Failed Change' }, false],
        [{ searchType: 'exact' }, false],
      ])('%j -> %s', (input, valid) => {
        expect(parse(input)).toBe(valid);
      });

      it.each([
        ['SOC-Servers', true],
        ['Finance Admins (EU)', true],
        ['x'.repeat(28), true],
        ['x'.repeat(29), false],
        ['a.b', false],
        ['a/b', false],
        ['a\\b', false],
        ['a"b', false],
        ['a|b', false],
        ['a?b', false],
        ['a*b', false],
        ['a<b', false],
        ['a:b', false],
        ['a\nb', false],
        ['', false],
      ])('safeName %j -> %s', (safeName, valid) => {
        expect(parse({ safeName })).toBe(valid);
      });

      it.each([
        ['WinServerLocal', true],
        ['Unix-SSH_Keys.v2', true],
        ['Win Server', false],
        ['x AND safeName eq other', false],
        ['x'.repeat(101), false],
      ])('platformId %j -> %s', (platformId, valid) => {
        expect(parse({ platformId })).toBe(valid);
      });
    });
  });

  describe('getAccountDetails', () => {
    it('returns the account record', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: ACCOUNT });

      await expect(run('getAccountDetails', ctx, { accountId: '12_3' })).resolves.toEqual(ACCOUNT);
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Accounts/12_3`,
        params: undefined,
        data: undefined,
      });
    });

    it('fails with a not-found error naming the account', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404, { ErrorCode: 'ITATS982I', ErrorMessage: 'gone' }));

      await expect(run('getAccountDetails', ctx, { accountId: '12_3' })).rejects.toThrow(
        'Not found: account 12_3 (HTTP 404 ITATS982I: gone).'
      );
    });

    it.each([
      ['12_3', true],
      ['0_0', true],
      ['12345678901234567890_1', true],
      [`${'1'.repeat(31)}_${'2'.repeat(32)}`, true],
      [`${'1'.repeat(32)}_${'2'.repeat(32)}`, false],
      ['12-3', false],
      ['12_3/../../Users', false],
      ['abc', false],
      ['12_', false],
      ['_3', false],
      ['', false],
    ])('accountId %j -> %s', (accountId, valid) => {
      expect(AccountIdInputSchema.safeParse({ accountId }).success).toBe(valid);
    });
  });

  describe('getAccountActivity', () => {
    it('returns Activities and Total as the API sends them', async () => {
      const { ctx, request } = createContext();
      const body = {
        Activities: [
          {
            Date: 1760000000,
            User: 'jsmith',
            Action: 'Retrieve Password',
            ActionID: 7,
            ClientID: 'PVWA',
            MoreInfo: '',
            Reason: 'INC-42',
            Alert: false,
          },
        ],
        Total: 1,
      };
      request.mockResolvedValue({ status: 200, data: body });

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).resolves.toEqual(body);
      expect(request.mock.calls[0][0].url).toBe(`${BASE}/Accounts/12_3/Activities`);
    });

    it('names View audit log on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(run('getAccountActivity', ctx, { accountId: '12_3' })).rejects.toThrow(
        'View audit log'
      );
    });
  });

  describe('addAccount', () => {
    const required = { safeName: 'SOC-Servers', platformId: 'UnixSSHKeys' };

    it('accepts an SSH private key as the secret', () => {
      const sshKey = `-----BEGIN OPENSSH PRIVATE KEY-----\n${'A'.repeat(
        3300
      )}\n-----END OPENSSH PRIVATE KEY-----`;
      expect(
        AddAccountInputSchema.safeParse({ ...required, secretType: 'key', secret: sshKey }).success
      ).toBe(true);
      expect(
        AddAccountInputSchema.safeParse({ ...required, secret: 'a'.repeat(16_385) }).success
      ).toBe(false);
    });

    it.each(['Operating System-UnixSSH-db01', 'db01_svc'])(
      'accepts the account name %s',
      (name) => {
        expect(AddAccountInputSchema.safeParse({ ...required, name }).success).toBe(true);
      }
    );

    it.each(['a/b', 'a\\b', 'a:b', 'a*b', 'a?b', 'a"b', 'a<b', 'a|b', 'a\tb'])(
      'rejects the account name %p, which the vault does not allow',
      (name) => {
        expect(AddAccountInputSchema.safeParse({ ...required, name }).success).toBe(false);
      }
    );

    it.each(['a'.repeat(29), 'SOC%Servers', 'SOC&Servers', 'SOC+Servers', 'SOC.Servers'])(
      'rejects the safe name %s, which the vault does not allow',
      (safeName) => {
        expect(AddAccountInputSchema.safeParse({ ...required, safeName }).success).toBe(false);
        expect(ListAccountsInputSchema.safeParse({ safeName }).success).toBe(false);
      }
    );

    it('posts the account and returns the created record', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 201, data: ACCOUNT });
      const input = {
        safeName: 'SOC-Servers',
        platformId: 'WinServerLocal',
        address: '10.0.0.5',
        userName: 'svc-backup',
        secretType: 'password',
        secret: 'Initial-Canary-1',
        platformAccountProperties: { LogonDomain: 'corp' },
        secretManagement: { automaticManagementEnabled: true },
      };

      const result = await run('addAccount', ctx, input);
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Accounts`,
        params: undefined,
        data: input,
      });
      expect(result).toEqual(ACCOUNT);
      expect(JSON.stringify(result)).not.toContain('Initial-Canary-1');
    });

    it('fails with "Already exists" on a 409', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(409, { ErrorCode: 'PASWS027E', ErrorMessage: 'The object already exists' })
      );

      await expect(
        run('addAccount', ctx, { safeName: 'SOC-Servers', platformId: 'WinServerLocal' })
      ).rejects.toThrow('Already exists');
    });

    it.each([
      [{ safeName: 'x'.repeat(28), platformId: 'P' }, true],
      [{ safeName: 'x'.repeat(29), platformId: 'P' }, false],
      [{ platformId: 'P' }, false],
      [{ safeName: 'S' }, false],
      [{ safeName: 'S', platformId: 'P', secretType: 'certificate' }, false],
      [{ safeName: 'S', platformId: 'P', address: 'a'.repeat(256) }, false],
      [{ safeName: 'S', platformId: 'P', userName: 'u'.repeat(128) }, true],
      [{ safeName: 'S', platformId: 'P', userName: 'u'.repeat(129) }, false],
      [
        { safeName: 'S', platformId: 'P', platformAccountProperties: { k: 'v'.repeat(1000) } },
        true,
      ],
      [
        { safeName: 'S', platformId: 'P', platformAccountProperties: { k: 'v'.repeat(1001) } },
        false,
      ],
      [{ safeName: 'S', platformId: 'P', secret: 's'.repeat(16_385) }, false],
      [
        {
          safeName: 'S',
          platformId: 'P',
          secretManagement: { manualManagementReason: 'r'.repeat(256) },
        },
        false,
      ],
      [{ safeName: 'S', platformId: 'P', secretManagement: { unknown: true } }, false],
      [
        {
          safeName: 'S',
          platformId: 'P',
          platformAccountProperties: Object.fromEntries(
            Array.from({ length: 50 }, (_, i) => [`k${i}`, 'v'])
          ),
        },
        true,
      ],
      [
        {
          safeName: 'S',
          platformId: 'P',
          platformAccountProperties: Object.fromEntries(
            Array.from({ length: 51 }, (_, i) => [`k${i}`, 'v'])
          ),
        },
        false,
      ],
      [
        { safeName: 'S', platformId: 'P', platformAccountProperties: { ['k'.repeat(101)]: 'v' } },
        false,
      ],
    ])('%j -> %s', (input, valid) => {
      expect(AddAccountInputSchema.safeParse(input).success).toBe(valid);
    });
  });

  describe('updateAccount', () => {
    it('sends the JSON Patch operations as the body', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { ...ACCOUNT, address: '10.0.0.6' } });
      const operations = [
        { op: 'replace', path: '/address', value: '10.0.0.6' },
        { op: 'replace', path: '/platformAccountProperties/LogonDomain', value: 'corp2' },
      ];

      const result = await run('updateAccount', ctx, { accountId: '12_3', operations });
      expect(sent(request)).toEqual({
        method: 'PATCH',
        url: `${BASE}/Accounts/12_3`,
        params: undefined,
        data: operations,
      });
      expect(result).toEqual({ ...ACCOUNT, address: '10.0.0.6' });
    });

    const op = (path: string, extra: Record<string, unknown> = {}) => ({
      accountId: '12_3',
      operations: [{ op: 'replace', path, value: 'v', ...extra }],
    });

    it.each([
      ['/address', true],
      ['/name', true],
      ['/platformId', true],
      ['/userName', true],
      ['/platformAccountProperties/LogonDomain', true],
      ['/secretManagement/automaticManagementEnabled', false],
      ['/safeName', false],
      ['/platformAccountProperties/', false],
      ['/platformAccountProperties/a/b', false],
      ['address', false],
    ])('path %s -> %s', (path, valid) => {
      expect(UpdateAccountInputSchema.safeParse(op(path)).success).toBe(valid);
    });

    it('accepts only replace operations, 1 to 50 of them', () => {
      expect(UpdateAccountInputSchema.safeParse(op('/address', { op: 'remove' })).success).toBe(
        false
      );
      expect(
        UpdateAccountInputSchema.safeParse({ accountId: '12_3', operations: [] }).success
      ).toBe(false);
      const many = (n: number) => ({
        accountId: '12_3',
        operations: Array.from({ length: n }, () => ({
          op: 'replace',
          path: '/address',
          value: 'v',
        })),
      });
      expect(UpdateAccountInputSchema.safeParse(many(50)).success).toBe(true);
      expect(UpdateAccountInputSchema.safeParse(many(51)).success).toBe(false);
    });
  });

  describe('repeat calls', () => {
    it('addAccount called twice fails the second time with "Already exists" and creates nothing more', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 201, data: ACCOUNT })
        .mockRejectedValueOnce(
          httpError(409, { ErrorCode: 'PASWS027E', ErrorMessage: 'The object already exists' })
        );
      const input = { safeName: 'SOC-Servers', platformId: 'WinServerLocal', address: '10.0.0.5' };

      await expect(run('addAccount', ctx, input)).resolves.toEqual(ACCOUNT);
      await expect(run('addAccount', ctx, input)).rejects.toThrow('Already exists');
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('updateAccount called twice sends the same operations and returns the same record', async () => {
      const { ctx, request } = createContext();
      const updated = { ...ACCOUNT, address: '10.0.0.6' };
      request.mockResolvedValue({ status: 200, data: updated });
      const input = {
        accountId: '12_3',
        operations: [{ op: 'replace', path: '/address', value: '10.0.0.6' }],
      };

      const first = await run('updateAccount', ctx, input);
      const second = await run('updateAccount', ctx, input);
      expect(first).toEqual(updated);
      expect(second).toEqual(first);
      expect(sent(request, 1).data).toEqual(sent(request, 0).data);
    });
  });
});
