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
  AddSafeMemberInputSchema,
  ListSafeMembersInputSchema,
  RemoveSafeMemberInputSchema,
} from './types';
import { BASE, httpError, createContext, run, sent } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });

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
        nextLink: 'api/safes/x/members?offset=25&limit=25',
        nextOffset: 25,
      });
    });

    it('fails with not found for a missing safe', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(404));

      await expect(run('listSafeMembers', ctx, { safeName: 'Nope' })).rejects.toThrow(
        'Not found: safe Nope'
      );
    });

    it('bounds the page size at 1000', () => {
      expect(ListSafeMembersInputSchema.safeParse({ safeName: 'S', limit: 1000 }).success).toBe(
        true
      );
      expect(ListSafeMembersInputSchema.safeParse({ safeName: 'S', limit: 1001 }).success).toBe(
        false
      );
    });

    it('bounds sort at 100 characters', () => {
      const parse = (sort: string) =>
        ListSafeMembersInputSchema.safeParse({ safeName: 'S', sort }).success;
      expect(parse('x'.repeat(100))).toBe(true);
      expect(parse('x'.repeat(101))).toBe(false);
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
      ).resolves.toEqual({ memberName: 'jsmith', safeName: 'SOC', added: true });
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
        added: false,
        alreadyMember: true,
      });
      expect(request).toHaveBeenCalledTimes(1);
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
      [{ memberName: 'x'.repeat(256) }, false],
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
      });
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
        added: true,
      });
      await expect(run('addSafeMember', ctx, input)).resolves.toEqual({
        safeName: 'SOC-Servers',
        memberName: 'jsmith',
        added: false,
        alreadyMember: true,
      });
      expect(request).toHaveBeenCalledTimes(2);
    });
  });
});
