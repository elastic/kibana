/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { withoutBookkeeping } from './client';
import {
  DIRECTORY,
  accepts,
  createContext,
  googleError,
  httpError,
  run,
  sent,
} from './test_helpers';

const GROUP = {
  kind: 'admin#directory#group',
  etag: '"g"',
  id: '03abc',
  email: 'security-team@example.com',
  name: 'Security team',
  description: 'SOC',
  directMembersCount: '3',
  adminCreated: true,
};

const MEMBER = {
  kind: 'admin#directory#member',
  etag: '"m"',
  id: '104512345678901234567',
  email: 'jdoe@example.com',
  role: 'MEMBER',
  type: 'USER',
  status: 'ACTIVE',
};

describe('Google Workspace Admin group actions', () => {
  beforeEach(() => {});

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listGroups', () => {
    it('sends my_customer and page size 100 by default and returns groups and the next token', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { groups: [GROUP], nextPageToken: 'n' } });
      const result = await run('listGroups', ctx, {});
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/groups`,
        params: { customer: 'my_customer', maxResults: 100 },
        data: undefined,
      });
      const group = withoutBookkeeping(GROUP);
      expect(result).toEqual({ groups: [group], nextPageToken: 'n' });
    });

    it('sends userKey without a customer for the groups of one user', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      expect(await run('listGroups', ctx, { userKey: 'jdoe@example.com', query: ' ' })).toEqual({
        groups: [],
      });
      expect(sent(request).params).toEqual({ userKey: 'jdoe@example.com', maxResults: 100 });
    });

    it('sends a domain without a customer', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: {} });
      await run('listGroups', ctx, { domain: 'example.com', query: 'email:admins*' });
      expect(sent(request).params).toEqual({
        domain: 'example.com',
        query: 'email:admins*',
        maxResults: 100,
      });
    });

    it.each([
      [{ userKey: 'jdoe@example.com', customer: 'my_customer' }, false],
      [{ userKey: '  ', customer: 'my_customer' }, true],
      [{ userKey: 'jdoe@example.com', customer: ' ' }, true],
      [{ userKey: 'jdoe@example.com', query: 'email:admins*' }, false],
      [{ userKey: ' ', query: 'email:admins*' }, true],
      [{ userKey: 'jdoe@example.com', query: ' ' }, true],
      [{ maxResults: 201 }, false],
      [{ maxResults: 200 }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listGroups', input)).toBe(expected);
    });
  });

  describe('listGroupMembers', () => {
    it('sends the roles as one comma-separated value', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { members: [MEMBER] } });
      const result = await run('listGroupMembers', ctx, {
        groupKey: 'security-team@example.com',
        roles: ['OWNER', 'MANAGER'],
        includeDerivedMembership: true,
        maxResults: 50,
        pageToken: 'p2',
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/groups/security-team%40example.com/members`,
        params: {
          roles: 'OWNER,MANAGER',
          includeDerivedMembership: true,
          maxResults: 50,
          pageToken: 'p2',
        },
        data: undefined,
      });
      const member = withoutBookkeeping(MEMBER);
      expect(result).toEqual({ members: [member] });
    });

    it('returns an empty list for a group without members', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { kind: 'admin#directory#members' } });
      expect(await run('listGroupMembers', ctx, { groupKey: 'empty@example.com' })).toEqual({
        members: [],
      });
      expect(sent(request).params).toEqual({ maxResults: 100 });
    });

    it.each([
      [{ groupKey: 'g@example.com', roles: ['ADMIN'] }, false],
      [{ groupKey: 'g@example.com', roles: ['member'] }, false],
      [{ groupKey: 'g@example.com', roles: [] }, false],
      [{ groupKey: 'g@example.com', roles: ['OWNER', 'MANAGER', 'MEMBER'] }, true],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('listGroupMembers', input)).toBe(expected);
    });
  });

  describe('removeGroupMember', () => {
    const input = { groupKey: 'security-team@example.com', memberKey: 'jdoe@example.com' };

    it('deletes the member and reports removed', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 204, data: '' });
      expect(await run('removeGroupMember', ctx, input)).toEqual({ ...input, status: 'removed' });
      expect(sent(request)).toEqual({
        method: 'DELETE',
        url: `${DIRECTORY}/groups/security-team%40example.com/members/jdoe%40example.com`,
        params: undefined,
        data: undefined,
      });
    });

    it('reports notMember when the group exists and the member is not in it', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(404, 'Resource Not Found: memberKey', 'notFound'))
        .mockResolvedValueOnce({ status: 200, data: { members: [] } });
      expect(await run('removeGroupMember', ctx, input)).toEqual({ ...input, status: 'notMember' });
      expect(sent(request, 1)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/groups/security-team%40example.com/members`,
        params: { maxResults: 1 },
        data: undefined,
      });
    });

    it('fails with Group not found for an unknown group', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(404, 'Resource Not Found: groupKey', 'notFound'));
      await expect(run('removeGroupMember', ctx, input)).rejects.toThrow(
        'Group security-team@example.com not found: Resource Not Found: groupKey.'
      );
    });

    it('raises the group read error itself when that read fails for another reason', async () => {
      const { ctx, request } = createContext();
      request
        .mockRejectedValueOnce(googleError(404, 'Resource Not Found: memberKey', 'notFound'))
        .mockRejectedValueOnce(googleError(403, 'Not Authorized', 'forbidden'));
      await expect(run('removeGroupMember', ctx, input)).rejects.toThrow(
        'lacks the scope or admin privilege for this action: Not Authorized.'
      );
    });

    it('reports notMember on a repeated removal', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 204, data: '' })
        .mockRejectedValueOnce(googleError(404, 'Resource Not Found: memberKey', 'notFound'))
        .mockResolvedValueOnce({ status: 200, data: { members: [] } });
      expect((await run('removeGroupMember', ctx, input)).status).toBe('removed');
      expect((await run('removeGroupMember', ctx, input)).status).toBe('notMember');
    });

    it('does not retry a removal that hits a server error', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(503));
      await expect(run('removeGroupMember', ctx, input)).rejects.toThrow(
        'Google Workspace is temporarily unavailable: 503.'
      );
      expect(request).toHaveBeenCalledTimes(1);
    });
  });

  describe('addGroupMember', () => {
    it('adds the member with role MEMBER by default and reports added', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: MEMBER });
      const result = await run('addGroupMember', ctx, {
        groupKey: 'investigation@example.com',
        email: 'jdoe@example.com',
      });
      expect(sent(request)).toEqual({
        method: 'POST',
        url: `${DIRECTORY}/groups/investigation%40example.com/members`,
        params: undefined,
        data: { email: 'jdoe@example.com', role: 'MEMBER' },
      });
      expect(result).toEqual({
        groupKey: 'investigation@example.com',
        email: 'jdoe@example.com',
        role: 'MEMBER',
        requestedRole: 'MEMBER',
        id: MEMBER.id,
        type: 'USER',
        status: 'added',
      });
    });

    it('sends the requested role', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { ...MEMBER, role: 'OWNER' } });
      const result = await run('addGroupMember', ctx, {
        groupKey: 'investigation@example.com',
        email: 'jdoe@example.com',
        role: 'OWNER',
      });
      expect(sent(request).data).toEqual({ email: 'jdoe@example.com', role: 'OWNER' });
      expect(result).toMatchObject({ role: 'OWNER', status: 'added' });
    });

    it('reports alreadyMember with the same keys when Google answers 409', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(409, 'Member already exists.', 'duplicate'));
      expect(
        await run('addGroupMember', ctx, {
          groupKey: 'investigation@example.com',
          email: 'jdoe@example.com',
          role: 'OWNER',
        })
      ).toEqual({
        groupKey: 'investigation@example.com',
        email: 'jdoe@example.com',
        role: null,
        requestedRole: 'OWNER',
        id: null,
        type: null,
        status: 'alreadyMember',
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('shows that a different requested role is not applied to an existing member', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(409, 'Member already exists.', 'duplicate'));
      const result = await run('addGroupMember', ctx, {
        groupKey: 'investigation@example.com',
        email: 'jdoe@example.com',
        role: 'MANAGER',
      });
      expect(result).toMatchObject({
        status: 'alreadyMember',
        role: null,
        requestedRole: 'MANAGER',
      });
      expect(request).toHaveBeenCalledTimes(1);
    });

    it('reports alreadyMember on a repeated add', async () => {
      const { ctx, request } = createContext();
      request
        .mockResolvedValueOnce({ status: 200, data: MEMBER })
        .mockRejectedValueOnce(googleError(409, 'Member already exists.', 'duplicate'));
      const input = { groupKey: 'investigation@example.com', email: 'jdoe@example.com' };
      expect((await run('addGroupMember', ctx, input)).status).toBe('added');
      expect((await run('addGroupMember', ctx, input)).status).toBe('alreadyMember');
    });

    it('fails for an unknown group', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(googleError(404, 'Resource Not Found: groupKey', 'notFound'));
      await expect(
        run('addGroupMember', ctx, { groupKey: 'nope@example.com', email: 'jdoe@example.com' })
      ).rejects.toThrow('Group nope@example.com not found');
    });

    it.each([
      [{ groupKey: 'g@example.com', email: 'not-an-email' }, false],
      [{ groupKey: 'g@example.com', email: 'a@example.com', role: 'ADMIN' }, false],
    ])('input %j is accepted: %s', (input, expected) => {
      expect(accepts('addGroupMember', input)).toBe(expected);
    });
  });
});
