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
import { MicrosoftEntraId } from './microsoft_entra_id';
import { retryTiming } from './graph_client';

const READ_TOOLS = [
  'getUser',
  'listUsers',
  'getUserAuthMethods',
  'getUserGroups',
  'listGroupMembers',
  'listGroups',
  'listRiskyUsers',
  'listUserAppRoleAssignments',
];

const STATE_CHANGING = [
  'disableUser',
  'enableUser',
  'revokeSignInSessions',
  'resetUserPassword',
  'deleteAuthMethod',
  'resetUserMfa',
  'confirmCompromisedUser',
  'dismissRiskyUser',
  'addUserToGroup',
  'removeUserFromGroup',
  'revokeUserAppAssignment',
  'createUser',
  'updateUser',
  'deleteUser',
  'request',
];

const makeContext = (config: Record<string, unknown> = {}) => {
  const request = jest.fn();
  const ctx = {
    client: { request },
    config,
    secrets: { authType: 'oauth_client_credentials' },
    log: { debug: jest.fn(), error: jest.fn() },
  } as unknown as ActionContext;
  return { ctx, request };
};

const configSchema = () => MicrosoftEntraId.schema as NonNullable<typeof MicrosoftEntraId.schema>;

describe('MicrosoftEntraId', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('is registered under its id', () => {
    expect(getConnectorSpec('.microsoft_entra_id')).toBe(MicrosoftEntraId);
  });

  it('ships for Agent Builder only, with an enterprise licence and no inbound events', () => {
    expect(MicrosoftEntraId.metadata.displayName).toBe('Microsoft Entra ID');
    expect(MicrosoftEntraId.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
    expect(MicrosoftEntraId.metadata.minimumLicense).toBe('enterprise');
    expect(MicrosoftEntraId.events).toBeUndefined();
  });

  it('keeps the Test connector button enabled', () => {
    expect(MicrosoftEntraId.test.enabled).toBe(true);
  });

  it('offers client secret and certificate auth, with the Graph .default scope as a placeholder', () => {
    const types = MicrosoftEntraId.auth?.types as Array<{
      type: string;
      defaults?: Record<string, unknown>;
      overrides?: { meta?: Record<string, { hidden?: boolean; placeholder?: string }> };
    }>;
    expect(types.map((t) => t.type)).toEqual([
      'oauth_client_credentials',
      'oauth_client_credentials_private_key_jwt',
    ]);
    for (const t of types) {
      // A visible field with a default would overwrite a national-cloud scope on edit.
      expect(t.defaults?.scope).toBeUndefined();
      expect(t.overrides?.meta?.scope?.placeholder).toBe('https://graph.microsoft.com/.default');
      for (const field of Object.keys(t.defaults ?? {})) {
        expect(t.overrides?.meta?.[field]?.hidden).toBe(true);
      }
    }
    expect(types[1].defaults).toEqual({ algorithm: 'PS256', certificateBinding: 'x5t#S256' });
  });

  it('exposes exactly the read actions as agent tools', () => {
    const actions = MicrosoftEntraId.actions;
    expect(Object.keys(actions).sort()).toEqual([...READ_TOOLS, ...STATE_CHANGING].sort());
    for (const name of READ_TOOLS) {
      expect({ name, isTool: actions[name].isTool, scope: actions[name].scope }).toEqual({
        name,
        isTool: true,
        scope: 'read',
      });
    }
    for (const name of STATE_CHANGING) {
      expect({ name, isTool: actions[name].isTool }).toEqual({ name, isTool: false });
      expect(['write', 'destroy']).toContain(actions[name].scope);
    }
  });

  describe('config', () => {
    it('defaults to the global Graph host and useBeta false', () => {
      expect(configSchema().parse({})).toEqual({
        graphBaseUrl: 'https://graph.microsoft.com',
        useBeta: 'false',
      });
    });

    it.each([
      ['https://graph.microsoft.us', true],
      ['http://localhost:18080', true],
      ['http://graph.microsoft.com', false],
      ['https://graph.microsoft.com/v1.0', false],
    ])('graphBaseUrl %s accepted: %s', (graphBaseUrl, ok) => {
      expect(configSchema().safeParse({ graphBaseUrl }).success).toBe(ok);
    });

    it('accepts useBeta false and true only', () => {
      expect(configSchema().safeParse({ useBeta: 'true' }).success).toBe(true);
      expect(configSchema().safeParse({ useBeta: 'false' }).success).toBe(true);
      expect(configSchema().safeParse({ useBeta: true }).success).toBe(false);
      expect(configSchema().safeParse({ useBeta: 'beta' }).success).toBe(false);
    });
  });

  describe('test handler', () => {
    it('reads one user id from the configured host', async () => {
      const { ctx, request } = makeContext({ graphBaseUrl: 'https://graph.microsoft.us' });
      request.mockResolvedValue({ status: 200, data: { value: [{ id: '1' }] } });
      await expect(MicrosoftEntraId.test.handler(ctx)).resolves.toEqual({});
      expect(request.mock.calls[0][0]).toMatchObject({
        method: 'GET',
        url: 'https://graph.microsoft.us/v1.0/users?$top=1&$select=id',
      });
    });

    it('fails when the credential is rejected', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(
        Object.assign(new Error('401'), {
          response: { status: 401, data: { error: { code: 'InvalidAuthenticationToken' } } },
        })
      );
      await expect(MicrosoftEntraId.test.handler(ctx)).rejects.toThrow(/authentication failed/);
    });

    it('fails when the permission is missing', async () => {
      const { ctx, request } = makeContext();
      request.mockRejectedValue(Object.assign(new Error('403'), { response: { status: 403 } }));
      await expect(MicrosoftEntraId.test.handler(ctx)).rejects.toThrow(/access denied/);
    });
  });

  it('keeps action descriptions short and free of routes', () => {
    const text = Object.values(MicrosoftEntraId.actions)
      .map((a) => a.description ?? '')
      .join(' ');
    expect(text.length).toBeLessThan(8_000);
    expect(text).not.toMatch(/\b(GET|POST|PATCH|DELETE) \//);
  });
});
