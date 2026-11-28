/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { retryTiming } from './graph_client';
import { groupActions } from './group_actions';
import { GroupMembershipInputSchema } from './types';

const GRAPH = 'https://graph.microsoft.com/v1.0';
const USER_ID = '6e7b768e-07e2-4810-8459-485f84f8f204';
const GROUP_ID = '02bd9fd6-8f93-4758-87c3-1fb73740a315';

const graphError = (status: number, message = 'Graph error') =>
  Object.assign(new Error(`status ${status}`), {
    response: { status, data: { error: { code: 'Code', message } }, headers: {} },
  });

const makeContext = (graphBaseUrl = 'https://graph.microsoft.com') => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config: { graphBaseUrl },
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

describe('Microsoft Entra ID group actions', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('getUserGroups', () => {
    it('reads nested memberships by default', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        data: { value: [{ id: GROUP_ID, '@odata.type': '#microsoft.graph.group' }] },
      });
      const result = await groupActions.getUserGroups.handler(ctx, { userId: USER_ID, top: 10 });
      expect(request.mock.calls[0][0].url).toBe(
        `${GRAPH}/users/${USER_ID}/transitiveMemberOf?$top=10`
      );
      expect(result).toEqual({
        found: true,
        value: [{ id: GROUP_ID, '@odata.type': '#microsoft.graph.group' }],
      });
    });

    it('reads direct memberships when transitive is false', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [] } });
      await groupActions.getUserGroups.handler(ctx, { userId: USER_ID, transitive: false });
      expect(request.mock.calls[0][0].url).toBe(`${GRAPH}/users/${USER_ID}/memberOf`);
    });

    it('returns found false for an unknown user', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(groupActions.getUserGroups.handler(ctx, { userId: USER_ID })).resolves.toEqual({
        found: false,
        userId: USER_ID,
        value: [],
      });
    });

    it.each([
      [`${GRAPH}/users/${USER_ID}/transitiveMemberOf?$skiptoken=a`, true],
      [`${GRAPH}/users('%24svc%40contoso.com')/memberOf?$skiptoken=a`, true],
      [`${GRAPH}/users/${USER_ID}/messages?$skiptoken=a`, false],
      [`${GRAPH}/users/${USER_ID}/mailFolders/x/transitiveMemberOf`, false],
      ['https://evil.example/v1.0/users/x/memberOf', false],
    ])('nextLink %s accepted: %s', async (nextLink, ok) => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [] } });
      const call = groupActions.getUserGroups.handler(ctx, { userId: USER_ID, nextLink });
      if (ok) {
        await call;
        expect(request.mock.calls[0][0].url).toBe(nextLink);
      } else {
        await expect(call).rejects.toThrow(/nextLink/);
        expect(request).not.toHaveBeenCalled();
      }
    });
  });

  describe('listGroupMembers', () => {
    it('lists members with id added to select and returns nextLink', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({
        data: {
          value: [{ id: USER_ID }],
          '@odata.nextLink': `${GRAPH}/groups/${GROUP_ID}/members?$skiptoken=n`,
        },
      });
      const result = await groupActions.listGroupMembers.handler(ctx, {
        groupId: GROUP_ID,
        top: 999,
        select: ['displayName', 'id'],
      });
      expect(request.mock.calls[0][0].url).toBe(
        `${GRAPH}/groups/${GROUP_ID}/members?$top=999&$select=id%2CdisplayName`
      );
      expect(result).toEqual({
        found: true,
        value: [{ id: USER_ID }],
        nextLink: `${GRAPH}/groups/${GROUP_ID}/members?$skiptoken=n`,
      });
    });

    it('returns found false for an unknown group', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404));
      await expect(
        groupActions.listGroupMembers.handler(ctx, { groupId: GROUP_ID })
      ).resolves.toMatchObject({ found: false, groupId: GROUP_ID });
    });
  });

  describe('listGroups', () => {
    it('sends the filter, and the advanced query header and count when asked', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ data: { value: [{ id: GROUP_ID }], '@odata.count': 1 } });
      const result = await groupActions.listGroups.handler(ctx, {
        filter: "displayName eq 'Quarantine'",
        advancedQuery: true,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        url: `${GRAPH}/groups?$filter=${encodeURIComponent(
          "displayName eq 'Quarantine'"
        )}&$count=true`,
        headers: { ConsistencyLevel: 'eventual' },
      });
      expect(result).toEqual({ value: [{ id: GROUP_ID }], count: 1 });
    });

    it('fails with the Graph message on an invalid filter', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(400, 'Invalid filter clause'));
      await expect(groupActions.listGroups.handler(ctx, { filter: 'bad' })).rejects.toThrow(
        'listGroups failed: Microsoft Graph rejected the request (Code): Invalid filter clause'
      );
    });
  });

  describe('addUserToGroup', () => {
    it('posts a directoryObjects reference on the configured host', async () => {
      const { ctx, request } = makeContext('https://graph.microsoft.us');
      request.mockResolvedValue({ status: 204 });
      const result = await groupActions.addUserToGroup.handler(ctx, {
        groupId: GROUP_ID,
        userId: USER_ID,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'POST',
        url: `https://graph.microsoft.us/v1.0/groups/${GROUP_ID}/members/$ref`,
        data: { '@odata.id': `https://graph.microsoft.us/v1.0/directoryObjects/${USER_ID}` },
        headers: { 'Content-Type': 'application/json' },
      });
      expect(result).toEqual({ status: 'requested', groupId: GROUP_ID, userId: USER_ID });
    });

    it('returns skipped when the user is already a member', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(
        graphError(
          400,
          'One or more added object references already exist for the following modified properties: members.'
        )
      );
      await expect(
        groupActions.addUserToGroup.handler(ctx, { groupId: GROUP_ID, userId: USER_ID })
      ).resolves.toEqual({
        status: 'skipped',
        groupId: GROUP_ID,
        userId: USER_ID,
        reason: 'already a member',
      });
    });

    it('fails for another 400 and does not retry a 503', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValueOnce(graphError(400, 'dynamic group'));
      await expect(
        groupActions.addUserToGroup.handler(ctx, { groupId: GROUP_ID, userId: USER_ID })
      ).rejects.toThrow(/dynamic group/);
      request.mockRejectedValueOnce(graphError(503));
      await expect(
        groupActions.addUserToGroup.handler(ctx, { groupId: GROUP_ID, userId: USER_ID })
      ).rejects.toThrow(/temporarily unavailable/);
      expect(request).toHaveBeenCalledTimes(2);
    });

    it('takes object ids only', () => {
      expect(
        GroupMembershipInputSchema.safeParse({ groupId: GROUP_ID, userId: 'jane@contoso.com' })
          .success
      ).toBe(false);
      expect(
        GroupMembershipInputSchema.safeParse({ groupId: "x' or 1", userId: USER_ID }).success
      ).toBe(false);
    });
  });

  describe('removeUserFromGroup', () => {
    it('deletes the membership reference, never the member object', async () => {
      const { ctx, request } = makeContext();
      request.mockResolvedValue({ status: 204 });
      const result = await groupActions.removeUserFromGroup.handler(ctx, {
        groupId: GROUP_ID,
        userId: USER_ID,
      });
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'DELETE',
        url: `${GRAPH}/groups/${GROUP_ID}/members/${USER_ID}/$ref`,
      });
      expect(result).toEqual({ status: 'requested', groupId: GROUP_ID, userId: USER_ID });
    });

    it('returns notFound with Graph message when the membership does not exist', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(graphError(404, 'Resource does not exist'));
      await expect(
        groupActions.removeUserFromGroup.handler(ctx, { groupId: GROUP_ID, userId: USER_ID })
      ).resolves.toEqual({
        status: 'notFound',
        groupId: GROUP_ID,
        userId: USER_ID,
        message: 'Resource does not exist',
      });
    });
  });
});
