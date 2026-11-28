/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  AddSafeMemberInputSchema,
  ListSafeMembersInputSchema,
  RemoveSafeMemberInputSchema,
} from './types';
import { Idira } from './idira';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listSafeMembers', () => {
    it('URL-encodes the safe name and sends the query parameters', async () => {
      const { ctx, request } = createContext();
      const member = {
        memberName: 'SOC Analysts',
        memberType: 'Group',
        memberId: 2,
        permissions: { listAccounts: true, useAccounts: true },
        membershipExpirationDate: null,
        isPredefinedUser: false,
      };
      request.mockResolvedValue({
        status: 200,
        data: { value: [member], count: 30, nextLink: 'api/safes/x/members?offset=25&limit=25' },
      });

      const result = await run('listSafeMembers', ctx, {
        safeName: 'Finance Admins (EU)',
        search: 'soc',
        filter: 'memberType eq Group',
        sort: 'memberName asc',
      });

      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Safes/Finance%20Admins%20(EU)/Members`,
        data: undefined,
        params: {
          search: 'soc',
          filter: 'memberType eq Group',
          sort: 'memberName asc',
          offset: 0,
          limit: 25,
        },
      });
      expect(result).toEqual({
        value: [member],
        count: 30,
        nextOffset: 25,
      });
      expect(result).not.toHaveProperty('nextLink');
    });

    it('fails with not found for a missing safe', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404));

      await expect(run('listSafeMembers', ctx, { safeName: 'Nope' })).rejects.toThrow(
        'Not found: safe Nope'
      );
    });

    it.each([
      ['<html><head><title>Sign In</title></head></html>', 'an HTML page titled "Sign In"'],
      ['', 'an empty body'],
      [{ count: 3 }, 'a JSON body without a value list'],
    ])('fails on HTTP 200 with %p instead of reporting no members', async (data, what) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data });

      await expect(run('listSafeMembers', ctx, { safeName: 'S1' })).rejects.toThrow(
        `answered GET /PasswordVault/API/Safes/S1/Members with HTTP 200 and ${what} instead of the value list (safe S1)`
      );
    });

    it('returns an empty page for an empty value list', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await expect(run('listSafeMembers', ctx, { safeName: 'S1' })).resolves.toEqual({
        value: [],
        count: 0,
      });
    });

    it('bounds the page size at 1000', () => {
      expect(ListSafeMembersInputSchema.safeParse({ safeName: 'S', limit: 1000 }).success).toBe(
        true
      );
      expect(ListSafeMembersInputSchema.safeParse({ safeName: 'S', limit: 1001 }).success).toBe(
        false
      );
    });

    it.each(['.', '..', '%2e%2e', 'a%2Fb', 'S1/', 'S1?x', '', '   '])(
      'rejects the safe name %p, which could leave its path segment',
      (safeName) => {
        expect(ListSafeMembersInputSchema.safeParse({ safeName }).success).toBe(false);
      }
    );

    it.each(['.', '..', '%2e%2e', 'S1/', ''])(
      'refuses the safe name %p in the path even when the schema is skipped',
      async (safeName) => {
        const { ctx, request } = createContext();
        await expect(Idira.actions.listSafeMembers.handler(ctx, { safeName })).rejects.toThrow(
          'cannot be used as a name or ID in a request URL'
        );
        expect(request).not.toHaveBeenCalled();
      }
    );

    it('encodes a fragment mark in a safe name, so it stays in its path segment', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await run('listSafeMembers', ctx, { safeName: 'S1#x' });
      expect(new URL(request.mock.calls[0][0].url).pathname).toBe(
        '/PasswordVault/API/Safes/S1%23x/Members'
      );
    });

    it('encodes a non-ASCII safe name and keeps it in its path segment', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await run('listSafeMembers', ctx, { safeName: 'Sécurité-Ops' });
      const url = request.mock.calls[0][0].url as string;
      expect(url).toBe(`${BASE}/Safes/S%C3%A9curit%C3%A9-Ops/Members`);
      expect(new URL(url).pathname).toBe('/PasswordVault/API/Safes/S%C3%A9curit%C3%A9-Ops/Members');
    });

    it('bounds sort at 100 characters', () => {
      const parse = (sort: string) =>
        ListSafeMembersInputSchema.safeParse({ safeName: 'S', sort }).success;
      expect(parse('x'.repeat(100))).toBe(true);
      expect(parse('x'.repeat(101))).toBe(false);
    });

    it.each(['search', 'filter'])('bounds %s at 200 characters, counted after trimming', (key) => {
      const parse = (value: string) =>
        ListSafeMembersInputSchema.safeParse({ safeName: 'S', [key]: value }).success;
      expect(parse('x'.repeat(200))).toBe(true);
      expect(parse('x'.repeat(201))).toBe(false);
      expect(parse(`  ${'x'.repeat(200)}  `)).toBe(true);
    });

    it('trims search, filter and sort, and drops a whitespace-only value', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await run('listSafeMembers', ctx, {
        safeName: 'S1',
        search: '  soc  ',
        filter: '   ',
        sort: ' memberName asc ',
      });
      expect(request.mock.calls[0][0].params).toEqual({
        search: 'soc',
        filter: undefined,
        sort: 'memberName asc',
        offset: 0,
        limit: 25,
      });
    });
  });

  describe('addSafeMember', () => {
    const future = () => Math.floor(Date.now() / 1000) + 3600;

    it('posts the member with its permissions and expiry, and returns the record with safeName', async () => {
      const { ctx, request } = createContext();
      const expiry = future();
      request.mockResolvedValue({
        status: 201,
        data: {
          memberName: 'jsmith',
          memberType: 'User',
          membershipExpirationDate: expiry,
          permissions: { listAccounts: true, useAccounts: true },
        },
      });

      const result = await run('addSafeMember', ctx, {
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        memberType: 'User',
        searchIn: 'Vault',
        membershipExpirationDate: expiry,
        permissions: { listAccounts: true, useAccounts: true },
      });

      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${BASE}/Safes/SOC-Servers/Members`,
        params: undefined,
        data: {
          memberName: 'jsmith',
          memberType: 'User',
          searchIn: 'Vault',
          membershipExpirationDate: expiry,
          permissions: { listAccounts: true, useAccounts: true },
        },
      });
      expect(result).toEqual({
        memberName: 'jsmith',
        memberType: 'User',
        membershipExpirationDate: expiry,
        permissions: { listAccounts: true, useAccounts: true },
        safeName: 'SOC-Servers',
        added: true,
        alreadyMember: false,
      });
    });

    it('keeps the safeName the API returned', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 201, data: { memberName: 'jsmith', safeName: 'SOC' } });

      await expect(
        run('addSafeMember', ctx, {
          safeName: 'soc',
          memberName: 'jsmith',
          memberType: 'User',
          permissions: {},
        })
      ).resolves.toEqual({
        memberName: 'jsmith',
        safeName: 'SOC',
        memberType: 'User',
        permissions: {},
        membershipExpirationDate: null,
        added: true,
        alreadyMember: false,
      });
    });

    it('returns the same keys from an empty 201 body, filled from what was sent', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 201, data: '' });

      await expect(
        run('addSafeMember', ctx, {
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'Group',
          permissions: { listAccounts: true },
        })
      ).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        memberType: 'Group',
        permissions: { listAccounts: true },
        membershipExpirationDate: null,
        added: true,
        alreadyMember: false,
      });
    });

    it('succeeds without a change when the member is already in the safe', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(409, { ErrorCode: 'SFWS0012E' }));

      await expect(
        run('addSafeMember', ctx, {
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'User',
          permissions: { listAccounts: true },
        })
      ).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        memberType: 'User',
        permissions: null,
        membershipExpirationDate: null,
        added: false,
        alreadyMember: true,
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('returns the same keys on the created and the already-member branch', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 201, data: { memberName: 'jsmith', memberId: '7' } })
        .mockRejectedValueOnce(httpError(409, { ErrorCode: 'SFWS0012E' }));
      const input = {
        safeName: 'S1',
        memberName: 'jsmith',
        memberType: 'User',
        permissions: { listAccounts: true },
      };

      const created = await run('addSafeMember', ctx, input);
      const already = await run('addSafeMember', ctx, input);
      expect(Object.keys(created as object).sort()).toEqual(Object.keys(already as object).sort());
    });

    it.each([400, 403, 404])('still fails on HTTP %s', async (status) => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(status));

      await expect(
        run('addSafeMember', ctx, {
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'User',
          permissions: { listAccounts: true },
        })
      ).rejects.toThrow(`HTTP ${status}`);
    });

    it('gives a valid read-only permissions example that grants only read access', () => {
      const description = AddSafeMemberInputSchema.shape.permissions.description ?? '';
      const example = /Example for read-only access: (\{[^}]*\})/.exec(description)?.[1];
      expect(example).toBeDefined();
      const permissions = JSON.parse(example as string);
      expect(permissions).toEqual({
        listAccounts: true,
        useAccounts: true,
        retrieveAccounts: true,
      });
      expect(
        AddSafeMemberInputSchema.safeParse({
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'User',
          permissions,
        }).success
      ).toBe(true);
    });

    it.each([
      [{ permissions: { listAccounts: true } }, true],
      [{ permissions: { initiateCPMAccountManagementOperations: true } }, true],
      [{ permissions: { listAccounts: 'yes' } }, false],
      [{ permissions: { readEverything: true } }, false],
      [{ memberType: 'Computer' }, false],
      [{ memberName: 'x'.repeat(255) }, true],
      [{ memberName: 'x'.repeat(256) }, false],
      [{ searchIn: 'x'.repeat(100) }, true],
      [{ searchIn: 'x'.repeat(101) }, false],
      [{ membershipExpirationDate: 1000 }, false],
      [{ membershipExpirationDate: Math.floor(Date.now() / 1000) + 600 }, true],
      [{ membershipExpirationDate: 32_503_680_000 }, true],
      [{ membershipExpirationDate: 32_503_680_001 }, false],
    ])('%j -> %s', (override, valid) => {
      expect(
        AddSafeMemberInputSchema.safeParse({
          safeName: 'SOC-Servers',
          memberName: 'jsmith',
          memberType: 'User',
          permissions: {},
          ...override,
        }).success
      ).toBe(valid);
    });
  });

  describe('removeSafeMember', () => {
    it('deletes the URL-encoded member and returns removed', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });

      await expect(
        run('removeSafeMember', ctx, { safeName: 'SOC-Servers', memberName: 'jsmith@corp.example' })
      ).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith@corp.example',
        removed: true,
        alreadyAbsent: false,
        detail: null,
      });
      // The vendor needs a trailing slash when the URL contains a dot; without it the API
      // answers 404, which would be reported as "already absent" while the access stays.
      expect(sent(request)).toEqual({
        method: 'DELETE',
        url: `${BASE}/Safes/SOC-Servers/Members/jsmith%40corp.example/`,
        params: undefined,
        data: undefined,
      });
    });

    it('sends no trailing slash for a member name without a dot', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });

      await run('removeSafeMember', ctx, { safeName: 'SOC-Servers', memberName: 'SOC Analysts' });
      expect(request.mock.calls[0][0].url).toBe(`${BASE}/Safes/SOC-Servers/Members/SOC%20Analysts`);
    });

    it('encodes the characters a member name may contain', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });

      await run('removeSafeMember', ctx, { safeName: 'S1', memberName: 'team #1=ops' });
      expect(request.mock.calls[0][0].url).toBe(`${BASE}/Safes/S1/Members/team%20%231%3Dops`);
    });

    it.each(['../../Users/1', 'a?b', 'a%2Fb', 'a&b', 'a+b', 'a\\b', 'a:b', 'a"b'])(
      'rejects the member name %s, which the vault does not allow',
      (memberName) => {
        expect(
          AddSafeMemberInputSchema.safeParse({
            safeName: 'S1',
            memberName,
            memberType: 'User',
            permissions: {},
          }).success
        ).toBe(false);
        expect(RemoveSafeMemberInputSchema.safeParse({ safeName: 'S1', memberName }).success).toBe(
          false
        );
      }
    );

    it.each(['.', '..', ' .. ', '%2e%2e', '%2F', 'a/', 'a?b', ''])(
      'rejects the member name %p before any request, so it cannot leave the member path',
      async (memberName) => {
        expect(
          AddSafeMemberInputSchema.safeParse({
            safeName: 'S1',
            memberName,
            memberType: 'User',
            permissions: {},
          }).success
        ).toBe(false);
        expect(RemoveSafeMemberInputSchema.safeParse({ safeName: 'S1', memberName }).success).toBe(
          false
        );
      }
    );

    it.each(['.', '..', '%2e%2e', 'a%2Fb', ''])(
      'refuses the member name %p in the path even when the schema is skipped',
      async (memberName) => {
        const { ctx, request } = createContext();
        await expect(
          Idira.actions.removeSafeMember.handler(ctx, { safeName: 'S1', memberName })
        ).rejects.toThrow('cannot be used as a name or ID in a request URL');
        expect(request).not.toHaveBeenCalled();
      }
    );

    it.each(['...', 'a..b', 'j.smith'])(
      'accepts the member name %p and keeps it in the member path',
      async (memberName) => {
        const { ctx, request } = createContext();
        request.mockResolvedValue({ status: 204, data: '' });

        await run('removeSafeMember', ctx, { safeName: 'S1', memberName });
        const url = request.mock.calls[0][0].url as string;
        expect(url).toBe(`${BASE}/Safes/S1/Members/${memberName}/`);
        expect(new URL(url).pathname).toBe(`/PasswordVault/API/Safes/S1/Members/${memberName}/`);
      }
    );

    it.each([
      ['jürgen', 'j%C3%BCrgen'],
      ['山田.太郎', '%E5%B1%B1%E7%94%B0.%E5%A4%AA%E9%83%8E/'],
    ])('encodes the non-ASCII member name %p in the member path', async (memberName, encoded) => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });

      await run('removeSafeMember', ctx, { safeName: 'S1', memberName });
      const url = request.mock.calls[0][0].url as string;
      expect(url).toBe(`${BASE}/Safes/S1/Members/${encoded}`);
      expect(new URL(url).pathname).toBe(`/PasswordVault/API/Safes/S1/Members/${encoded}`);
    });

    it('keeps a 255-character member name in one path segment', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      const memberName = 'm'.repeat(255);

      await run('removeSafeMember', ctx, { safeName: 'S1', memberName });
      expect(new URL(request.mock.calls[0][0].url).pathname).toBe(
        `/PasswordVault/API/Safes/S1/Members/${memberName}`
      );
    });

    it('returns alreadyAbsent on a 404, so a repeated call is safe', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404, { ErrorCode: 'ITATS982I' }));

      await expect(
        run('removeSafeMember', ctx, { safeName: 'SOC-Servers', memberName: 'jsmith' })
      ).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        removed: false,
        alreadyAbsent: true,
        detail: expect.any(String),
      });
    });

    it('says in detail and in the description that a 404 can also mean a missing safe', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(
        httpError(404, {
          ErrorCode: 'ITATS982I',
          ErrorMessage: 'The requested object was not found',
        })
      );

      const result = (await run('removeSafeMember', ctx, {
        safeName: 'No-Such-Safe',
        memberName: 'jsmith',
      })) as Record<string, unknown>;
      expect(result.detail).toBe(
        'Not found: member jsmith of safe No-Such-Safe (HTTP 404 ITATS982I: The requested object was not found). The member is not in the safe, or the safe does not exist.'
      );
      expect(Idira.actions.removeSafeMember.description).toContain(
        'the API also answers not found when the safe does not exist'
      );
    });

    it('returns the same keys on the removed and the already-absent branch', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 204, data: '' })
        .mockRejectedValueOnce(httpError(404, { ErrorCode: 'ITATS982I' }));
      const input = { safeName: 'S1', memberName: 'jsmith' };

      const removed = await run('removeSafeMember', ctx, input);
      const absent = await run('removeSafeMember', ctx, input);
      expect(Object.keys(removed as object).sort()).toEqual(Object.keys(absent as object).sort());
    });

    it('still fails on a 403', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(
        run('removeSafeMember', ctx, { safeName: 'SOC-Servers', memberName: 'jsmith' })
      ).rejects.toThrow('Manage Safe members');
    });

    it('requires both names', () => {
      expect(RemoveSafeMemberInputSchema.safeParse({ safeName: 'S' }).success).toBe(false);
      expect(RemoveSafeMemberInputSchema.safeParse({ memberName: 'm' }).success).toBe(false);
    });
  });

  describe('repeat calls', () => {
    it('addSafeMember called twice adds the member once and reports it as already a member the second time', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({
          status: 201,
          data: { memberName: 'jsmith', safeName: 'SOC-Servers' },
        })
        .mockRejectedValueOnce(httpError(409, { ErrorCode: 'SFWS0012E' }));
      const input = {
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        memberType: 'User',
        permissions: { listAccounts: true },
      };

      await expect(run('addSafeMember', ctx, input)).resolves.toEqual({
        memberName: 'jsmith',
        safeName: 'SOC-Servers',
        memberType: 'User',
        permissions: { listAccounts: true },
        membershipExpirationDate: null,
        added: true,
        alreadyMember: false,
      });
      await expect(run('addSafeMember', ctx, input)).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        memberType: 'User',
        permissions: null,
        membershipExpirationDate: null,
        added: false,
        alreadyMember: true,
      });
      expect(request).toHaveBeenCalledTimes(2);
    });
  });
});
