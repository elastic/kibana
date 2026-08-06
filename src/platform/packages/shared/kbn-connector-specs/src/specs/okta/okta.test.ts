/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActionContext } from '../../connector_spec';
import { getConnectorSpec } from '../../..';
import { Okta } from './okta';
import { SearchUsersInputSchema } from './types';

const EXPECTED_OAUTH_SCOPES = 'okta.users.manage okta.groups.manage okta.logs.read';

const ORG_URL = 'https://example.okta.com';

describe('Okta', () => {
  const mockClient = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  };

  const mockContext = {
    client: mockClient,
    config: { orgUrl: ORG_URL },
    secrets: { authType: 'oauth_client_credentials_private_key_jwt' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(Okta).toBeDefined();
  });

  it('should be discoverable via getConnectorSpec (all_specs wiring)', () => {
    const spec = getConnectorSpec('.okta');
    expect(spec).toBe(Okta);
    expect(spec?.actions.getUser).toBeDefined();
    expect(spec?.actions.suspendUser.isTool).toBe(true);
  });

  it('should have correct metadata', () => {
    expect(Okta.metadata.id).toBe('.okta');
    expect(Okta.metadata.displayName).toBe('Okta');
    expect(Okta.metadata.minimumLicense).toBe('enterprise');
    expect(Okta.metadata.supportedFeatureIds).toEqual(['agentBuilder', 'workflows']);
  });

  it('should support private_key_jwt and SSWS api_key_header auth', () => {
    const types = (Okta.auth?.types as Array<string | { type: string }>).map((t) =>
      typeof t === 'string' ? t : t.type
    );
    expect(types).toContain('oauth_client_credentials_private_key_jwt');
    expect(types).toContain('api_key_header');
  });

  it('should default OAuth scopes to the documented manage/read set', () => {
    const oauth = (Okta.auth?.types as Array<{ type: string; defaults?: { scope?: string } }>).find(
      (t) => t.type === 'oauth_client_credentials_private_key_jwt'
    );
    expect(oauth?.defaults?.scope).toBe(EXPECTED_OAUTH_SCOPES);
  });

  it('should keep the Test connector button enabled', () => {
    expect(Okta.test?.enabled).toBe(true);
  });

  it('should reject searchUsers input that combines search and filter', () => {
    const result = SearchUsersInputSchema.safeParse({
      search: 'profile.email eq "a@example.com"',
      filter: 'status eq "ACTIVE"',
    });
    expect(result.success).toBe(false);
  });

  describe('transport helpers', () => {
    it('should throw when Org URL is missing', async () => {
      const ctx = { ...mockContext, config: {} } as unknown as ActionContext;
      await expect(Okta.actions.getUser.handler(ctx, { userId: '00u1' })).rejects.toThrow(
        'Okta connector is missing the required Org URL configuration field.'
      );
    });

    it('should format Okta API error payloads', async () => {
      mockClient.get.mockRejectedValue({
        response: {
          status: 404,
          data: {
            errorCode: 'E0000007',
            errorSummary: 'Not found: Resource not found: 00u1 (User)',
            errorId: 'oaeABC',
            errorCauses: [],
          },
        },
        message: 'Request failed',
      });

      await expect(Okta.actions.getUser.handler(mockContext, { userId: '00u1' })).rejects.toThrow(
        'Okta getUser failed (status 404) [E0000007]: Not found: Resource not found: 00u1 (User) (errorId: oaeABC)'
      );
    });

    it('should send SSWS Authorization when using api_key_header auth', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '00u1' } });
      const ctx = {
        ...mockContext,
        secrets: { authType: 'api_key_header', apiToken: '00rawtoken' },
      } as unknown as ActionContext;

      await Okta.actions.getUser.handler(ctx, { userId: '00u1' });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users/00u1`, {
        headers: { Authorization: 'SSWS 00rawtoken' },
      });
    });

    it('should not double-prefix an already-prefixed SSWS token', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '00u1' } });
      const ctx = {
        ...mockContext,
        secrets: { authType: 'api_key_header', apiToken: 'SSWS already' },
      } as unknown as ActionContext;

      await Okta.actions.getUser.handler(ctx, { userId: '00u1' });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1`,
        expect.objectContaining({
          headers: { Authorization: 'SSWS already' },
        })
      );
    });
  });

  describe('getUser', () => {
    it('should GET the user path with encodeURIComponent', async () => {
      mockClient.get.mockResolvedValue({ data: { id: '00u1', status: 'ACTIVE' } });

      const result = await Okta.actions.getUser.handler(mockContext, {
        userId: 'alice@example.com',
      });

      expect(mockClient.get).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/alice%40example.com`,
        {}
      );
      expect(result).toEqual({ id: '00u1', status: 'ACTIVE' });
    });
  });

  describe('getUserGroups', () => {
    it('should GET /users/{id}/groups', async () => {
      mockClient.get.mockResolvedValue({ data: [{ id: '00g1', profile: { name: 'Everyone' } }] });

      const result = await Okta.actions.getUserGroups.handler(mockContext, { userId: '00u1' });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users/00u1/groups`, {});
      expect(result).toEqual({
        groups: [{ id: '00g1', profile: { name: 'Everyone' } }],
      });
    });
  });

  describe('lifecycle containment', () => {
    it('should POST suspend', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '00u1', status: 'SUSPENDED' } });

      await Okta.actions.suspendUser.handler(mockContext, { userId: '00u1' });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/suspend`,
        null,
        {}
      );
    });

    it('should POST unsuspend', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '00u1', status: 'ACTIVE' } });

      await Okta.actions.unsuspendUser.handler(mockContext, { userId: '00u1' });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/unsuspend`,
        null,
        {}
      );
    });

    it('should POST deactivate with sendEmail query param', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await Okta.actions.deactivateUser.handler(mockContext, {
        userId: '00u1',
        sendEmail: false,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/deactivate`,
        null,
        { params: { sendEmail: false } }
      );
    });

    it('should POST activate with sendEmail query param', async () => {
      mockClient.post.mockResolvedValue({ data: { activationToken: 'abc' } });

      await Okta.actions.activateUser.handler(mockContext, {
        userId: '00u1',
        sendEmail: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/activate`,
        null,
        { params: { sendEmail: true } }
      );
    });

    it('should POST reset_factors', async () => {
      mockClient.post.mockResolvedValue({ data: {} });

      await Okta.actions.resetFactors.handler(mockContext, { userId: '00u1' });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/reset_factors`,
        null,
        {}
      );
    });
  });

  describe('clearUserSessions', () => {
    it('should DELETE sessions with oauthTokens and forgetDevices as query params', async () => {
      mockClient.delete.mockResolvedValue({ status: 204 });

      const result = await Okta.actions.clearUserSessions.handler(mockContext, {
        userId: '00u1',
        oauthTokens: true,
        forgetDevices: true,
      });

      expect(mockClient.delete).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users/00u1/sessions`, {
        params: { oauthTokens: true, forgetDevices: true },
      });
      expect(result).toEqual({ ok: true });
    });
  });

  describe('credentials', () => {
    it('should POST reset_password with required sendEmail query param', async () => {
      mockClient.post.mockResolvedValue({ data: { resetPasswordUrl: 'https://example/reset' } });

      await Okta.actions.resetPassword.handler(mockContext, {
        userId: '00u1',
        sendEmail: false,
        revokeSessions: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/reset_password`,
        null,
        { params: { sendEmail: false, revokeSessions: true } }
      );
    });

    it('should POST expire_password by default', async () => {
      mockClient.post.mockResolvedValue({ data: { id: '00u1' } });

      await Okta.actions.expirePassword.handler(mockContext, { userId: '00u1' });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/expire_password`,
        null,
        {}
      );
    });

    it('should POST expire_password_with_temp_password when tempPassword is true', async () => {
      mockClient.post.mockResolvedValue({ data: { tempPassword: 'tmp' } });

      await Okta.actions.expirePassword.handler(mockContext, {
        userId: '00u1',
        tempPassword: true,
      });

      expect(mockClient.post).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/users/00u1/lifecycle/expire_password_with_temp_password`,
        null,
        {}
      );
    });
  });

  describe('factors and groups', () => {
    it('should GET factors', async () => {
      mockClient.get.mockResolvedValue({
        data: [{ id: 'opf1', factorType: 'token:software:totp' }],
      });

      const result = await Okta.actions.getUserFactors.handler(mockContext, { userId: '00u1' });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users/00u1/factors`, {});
      expect(result).toEqual({
        factors: [{ id: 'opf1', factorType: 'token:software:totp' }],
      });
    });

    it('should PUT addUserToGroup', async () => {
      mockClient.put.mockResolvedValue({ status: 204 });

      await Okta.actions.addUserToGroup.handler(mockContext, {
        userId: '00u1',
        groupId: '00g1',
      });

      expect(mockClient.put).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/groups/00g1/users/00u1`,
        null,
        {}
      );
    });

    it('should DELETE removeUserFromGroup', async () => {
      mockClient.delete.mockResolvedValue({ status: 204 });

      await Okta.actions.removeUserFromGroup.handler(mockContext, {
        userId: '00u1',
        groupId: '00g1',
      });

      expect(mockClient.delete).toHaveBeenCalledWith(
        `${ORG_URL}/api/v1/groups/00g1/users/00u1`,
        {}
      );
    });
  });

  describe('listUsers and searchUsers', () => {
    it('should list users with sort and pagination params', async () => {
      mockClient.get.mockResolvedValue({
        data: [{ id: '00u1' }],
        headers: { link: '<https://example.okta.com/api/v1/users?after=cursor>; rel="next"' },
      });

      const result = await Okta.actions.listUsers.handler(mockContext, {
        limit: 50,
        after: 'cursor',
        sortBy: 'status',
        sortOrder: 'desc',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users`, {
        params: { limit: 50, after: 'cursor', sortBy: 'status', sortOrder: 'desc' },
      });
      expect(result).toEqual({
        users: [{ id: '00u1' }],
        link: '<https://example.okta.com/api/v1/users?after=cursor>; rel="next"',
      });
    });

    it('should search users with q and search params', async () => {
      mockClient.get.mockResolvedValue({ data: [], headers: {} });

      await Okta.actions.searchUsers.handler(mockContext, {
        q: 'alice',
        search: 'profile.department eq "SOC"',
        limit: 25,
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users`, {
        params: { q: 'alice', search: 'profile.department eq "SOC"', limit: 25 },
      });
    });
  });

  describe('getLogs', () => {
    it('should GET /api/v1/logs with filter query params', async () => {
      mockClient.get.mockResolvedValue({ data: [{ uuid: 'log1' }], headers: {} });

      await Okta.actions.getLogs.handler(mockContext, {
        since: '2024-01-01T00:00:00.000Z',
        until: '2024-01-02T00:00:00.000Z',
        filter: 'eventType eq "user.session.start"',
        limit: 100,
        sortOrder: 'DESCENDING',
      });

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/logs`, {
        params: {
          since: '2024-01-01T00:00:00.000Z',
          until: '2024-01-02T00:00:00.000Z',
          filter: 'eventType eq "user.session.start"',
          limit: 100,
          sortOrder: 'DESCENDING',
        },
      });
    });
  });

  describe('test handler', () => {
    it('should probe GET /api/v1/users?limit=1', async () => {
      mockClient.get.mockResolvedValue({ data: [] });

      const testHandler = Okta.test?.handler;
      expect(testHandler).toBeDefined();
      if (!testHandler) {
        return;
      }
      await testHandler(mockContext);

      expect(mockClient.get).toHaveBeenCalledWith(`${ORG_URL}/api/v1/users`, {
        params: { limit: 1 },
      });
    });
  });
});
