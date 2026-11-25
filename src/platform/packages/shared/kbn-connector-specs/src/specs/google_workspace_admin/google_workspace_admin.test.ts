/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AuthTypeDef } from '../../connector_spec';
import { GoogleWorkspaceAdmin } from './google_workspace_admin';
import { API_URL, DIRECTORY, createContext, httpError, sent } from './test_helpers';

const READ_TOOLS = [
  'getUser',
  'listActivities',
  'listAppPasswords',
  'listGroupMembers',
  'listGroups',
  'listMobileDevices',
  'listRoleAssignments',
  'listUserTokens',
  'listUsers',
  'listVerificationCodes',
];

const SCOPES = [
  'https://www.googleapis.com/auth/admin.directory.user',
  'https://www.googleapis.com/auth/admin.directory.user.security',
  'https://www.googleapis.com/auth/admin.directory.group',
  'https://www.googleapis.com/auth/admin.directory.group.member',
  'https://www.googleapis.com/auth/admin.directory.rolemanagement.readonly',
  'https://www.googleapis.com/auth/admin.directory.device.mobile.action',
  'https://www.googleapis.com/auth/admin.reports.audit.readonly',
];

const authType = (type: string) =>
  GoogleWorkspaceAdmin.auth?.types.find(
    (entry): entry is AuthTypeDef => typeof entry !== 'string' && entry.type === type
  );

describe('GoogleWorkspaceAdmin', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('metadata and auth', () => {
    it('ships for Agent Builder only, with an enterprise license', () => {
      expect(GoogleWorkspaceAdmin.metadata.id).toBe('.google_workspace_admin');
      expect(GoogleWorkspaceAdmin.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(GoogleWorkspaceAdmin.metadata.minimumLicense).toBe('enterprise');
      expect(GoogleWorkspaceAdmin.events).toBeUndefined();
    });

    it('recommends OAuth authorization with every scope the actions need and offline access', () => {
      const oauth = authType('oauth_authorization_code');
      expect(oauth?.isRecommended).toBe(true);
      expect(String(oauth?.defaults.scope).split(' ')).toEqual(SCOPES);
      expect(oauth?.defaults.tokenUrl).toBe('https://oauth2.googleapis.com/token');
      const authorizationUrl = new URL(String(oauth?.defaults.authorizationUrl));
      expect(authorizationUrl.origin + authorizationUrl.pathname).toBe(
        'https://accounts.google.com/o/oauth2/v2/auth'
      );
      expect(authorizationUrl.searchParams.get('access_type')).toBe('offline');
      expect(authorizationUrl.searchParams.get('prompt')).toBe('consent');
    });

    it('offers a visible bearer access token', () => {
      const bearer = authType('bearer');
      expect(bearer).toBeDefined();
      expect(bearer?.isLegacy).toBeUndefined();
    });
  });

  describe('config schema', () => {
    it('needs no configuration: the Admin SDK host is fixed', () => {
      const result = GoogleWorkspaceAdmin.schema?.safeParse({});
      expect(result?.success).toBe(true);
      expect(result?.data).toEqual({});
      expect(GoogleWorkspaceAdmin.validateUrls).toBeUndefined();
    });

    it('sends every request to the Admin SDK host', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { users: [] } });
      await GoogleWorkspaceAdmin.test?.handler(ctx);
      expect(request.mock.calls[0][0].url).toBe(`${API_URL}/admin/directory/v1/users`);
    });
  });

  describe('actions', () => {
    it('exposes only the read actions as Agent Builder tools', () => {
      const tools = Object.entries(GoogleWorkspaceAdmin.actions)
        .filter(([, action]) => action.isTool)
        .map(([name]) => name)
        .sort();
      expect(tools).toEqual(READ_TOOLS);
      for (const name of READ_TOOLS) {
        expect(GoogleWorkspaceAdmin.actions[name].scope).toBe('read');
      }
    });

    it('does not point agents at actions they cannot call', () => {
      const hidden = Object.entries(GoogleWorkspaceAdmin.actions)
        .filter(([, action]) => !action.isTool)
        .map(([name]) => name);
      const agentText = [
        GoogleWorkspaceAdmin.skill ?? '',
        ...READ_TOOLS.map((name) => GoogleWorkspaceAdmin.actions[name].description ?? ''),
      ].join('\n');
      for (const name of hidden) {
        expect(agentText).not.toContain(name);
      }
    });

    it('marks every state-changing action as not a tool', () => {
      const others = Object.entries(GoogleWorkspaceAdmin.actions).filter(
        ([name]) => !READ_TOOLS.includes(name)
      );
      expect(others.map(([name]) => name).sort()).toEqual([
        'actionMobileDevice',
        'addGroupMember',
        'invalidateVerificationCodes',
        'removeGroupMember',
        'revokeAppPasswords',
        'revokeUserToken',
        'signOutUser',
        'suspendUser',
        'unsuspendUser',
        'updateUser',
      ]);
      for (const [, action] of others) {
        expect(action.isTool).toBe(false);
        expect(['write', 'destroy']).toContain(action.scope);
      }
    });
  });

  describe('test handler', () => {
    it('reads one user of my_customer', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { users: [{ id: '1' }] } });
      expect(GoogleWorkspaceAdmin.test.enabled).toBe(true);
      expect(await GoogleWorkspaceAdmin.test.handler(ctx)).toEqual({ usersVisible: true });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${DIRECTORY}/users`,
        params: { customer: 'my_customer', maxResults: 1 },
        data: undefined,
      });
    });

    it('fails on a rejected token', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(401, { error: { code: 401, message: 'Invalid' } }));
      await expect(GoogleWorkspaceAdmin.test.handler(ctx)).rejects.toThrow(
        'Google Workspace authorization failed or expired'
      );
    });
  });
});
