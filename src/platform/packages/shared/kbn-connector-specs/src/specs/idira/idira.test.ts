/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext } from '../../connector_spec';
import { OAuth } from '../../auth_types/oauth';
import { getSchemaForAuthType } from '../../lib/get_schema_for_auth_type';
import { Idira } from './idira';
import { retryTiming } from './client';
import { API_URL, BASE, httpError, createContext, run, sent, ACCOUNT } from './test_helpers';

describe('Idira Privilege Cloud connector', () => {
  beforeEach(() => {
    jest.spyOn(retryTiming, 'sleep').mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('metadata', () => {
    it('exposes exactly the actions of the approved scope', () => {
      expect(Object.keys(Idira.actions).sort()).toEqual(
        [
          'listAccounts',
          'getAccountDetails',
          'getAccountActivity',
          'changeAccountPassword',
          'reconcileAccountCredentials',
          'verifyAccountCredentials',
          'setAccountPassword',
          'addAccount',
          'updateAccount',
          'listSafeMembers',
          'addSafeMember',
          'removeSafeMember',
          'suspendUser',
          'activateUser',
        ].sort()
      );
    });

    it('ships for Agent Builder only in the first release', () => {
      expect(Idira.metadata.supportedFeatureIds).toEqual(['agentBuilder']);
      expect(Idira.events).toBeUndefined();
    });

    // Agents get the reads and the protective CPM operations only. The other writes cut or grant
    // access, carry a credential the caller chooses, or redirect where the CPM sends a credential.
    const NOT_TOOLS = [
      'setAccountPassword',
      'addAccount',
      'updateAccount',
      'addSafeMember',
      'removeSafeMember',
      'suspendUser',
      'activateUser',
    ];
    const TOOLS = Object.keys(Idira.actions).filter((name) => !NOT_TOOLS.includes(name));

    it.each(Object.entries(Idira.actions))('%s has a scope and a description', (_name, action) => {
      expect(['read', 'write', 'destroy']).toContain(action.scope);
      expect(action.description).toEqual(expect.any(String));
    });

    it('offers agents only the reads and the protective CPM operations', () => {
      expect(TOOLS.sort()).toEqual(
        [
          'listAccounts',
          'getAccountDetails',
          'getAccountActivity',
          'listSafeMembers',
          'changeAccountPassword',
          'reconcileAccountCredentials',
          'verifyAccountCredentials',
        ].sort()
      );
    });

    it.each(Object.entries(Idira.actions))(
      '%s is a tool only when it is allowed',
      (name, action) => {
        expect(action.isTool).toBe(!NOT_TOOLS.includes(name));
      }
    );

    it('never points agents to an action they cannot call', () => {
      const agentText = [Idira.skill, ...TOOLS.map((name) => Idira.actions[name].description)];
      for (const text of agentText) {
        for (const name of NOT_TOOLS) {
          expect(text).not.toContain(name);
        }
      }
    });

    it.each([
      ['listAccounts', 'read'],
      ['getAccountDetails', 'read'],
      ['getAccountActivity', 'read'],
      ['listSafeMembers', 'read'],
      ['changeAccountPassword', 'destroy'],
      ['reconcileAccountCredentials', 'destroy'],
      ['setAccountPassword', 'destroy'],
      ['updateAccount', 'destroy'],
      ['removeSafeMember', 'destroy'],
      ['suspendUser', 'destroy'],
      // Both change existing state: a failed verification marks the account as failed, and
      // enabling a user changes the user's state.
      ['verifyAccountCredentials', 'destroy'],
      ['activateUser', 'destroy'],
      ['addAccount', 'write'],
      ['addSafeMember', 'write'],
    ] as const)('%s has scope %s', (name, scope) => {
      expect(Idira.actions[name].scope).toBe(scope);
    });

    it('sends the token as "Bearer" through hidden OAuth client-credentials defaults', () => {
      const [authType] = Idira.auth?.types ?? [];
      if (typeof authType !== 'object') {
        throw new Error('the connector defines no configurable auth type');
      }
      expect(authType.type).toBe('oauth_client_credentials');
      expect(authType.defaults).toEqual({
        tokenEndpointAuthMethod: 'client_secret_post',
        tokenType: 'Bearer',
      });
      expect(authType.overrides?.meta?.tokenType).toEqual({ hidden: true });
      expect(authType.overrides?.meta?.tokenEndpointAuthMethod).toEqual({ hidden: true });
    });

    it('rejects a Privilege Cloud URL over plain http to a remote host', () => {
      const schema = Idira.schema;
      if (!schema) {
        throw new Error('the connector defines no config schema');
      }
      expect(schema.safeParse({ apiUrl: API_URL }).success).toBe(true);
      expect(schema.safeParse({ apiUrl: 'http://localhost:18080' }).success).toBe(true);
      expect(
        schema.safeParse({ apiUrl: 'http://acme.privilegecloud.cyberark.cloud' }).success
      ).toBe(false);
    });

    it.each(['?tenant=acme', '#portal', '?'])(
      'rejects a Privilege Cloud URL with a query string or fragment (%s)',
      (suffix) => {
        const schema = Idira.schema;
        if (!schema) {
          throw new Error('the connector defines no config schema');
        }
        expect(schema.safeParse({ apiUrl: `${API_URL}/${suffix}` }).success).toBe(false);
      }
    );

    describe('token URL, checked when the connector is saved', () => {
      // Kibana requests the token, with the client secret, before an action handler runs.
      const [authType] = Idira.auth?.types ?? [];
      const secretsSchema = getSchemaForAuthType(authType);
      const secrets = {
        authType: 'oauth_client_credentials',
        tokenUrl: 'https://abc1234.id.cyberark.cloud/oauth2/platformtoken',
        clientId: 'svc-kibana@acme',
        clientSecret: 'client-secret',
      };

      it.each([
        'https://abc1234.id.cyberark.cloud/oauth2/platformtoken',
        'http://localhost:18080/oauth2/platformtoken',
      ])('accepts %s', (tokenUrl) => {
        expect(secretsSchema.schema.safeParse({ ...secrets, tokenUrl }).success).toBe(true);
      });

      it('caps the token URL at 2048 characters', () => {
        const base = 'https://abc1234.id.cyberark.cloud/oauth2/platformtoken?x=';
        const atLimit = `${base}${'a'.repeat(2048 - base.length)}`;
        expect(atLimit).toHaveLength(2048);
        expect(secretsSchema.schema.safeParse({ ...secrets, tokenUrl: atLimit }).success).toBe(
          true
        );
        expect(
          secretsSchema.schema.safeParse({ ...secrets, tokenUrl: `${atLimit}a` }).success
        ).toBe(false);
      });

      it('rejects plain http to a remote host and says why', () => {
        const result = secretsSchema.schema.safeParse({
          ...secrets,
          tokenUrl: 'http://abc1234.id.cyberark.cloud/oauth2/platformtoken',
        });
        expect(result.success).toBe(false);
        expect(JSON.stringify(result.error?.issues)).toContain('The token URL must use https');
      });

      it('keeps the help text and the allowed-hosts check of the token URL field', () => {
        expect(secretsSchema.schema.shape.tokenUrl.meta()).toMatchObject({
          validate: { allowedHosts: true },
          placeholder: 'https://your-tenant-id.id.cyberark.cloud/oauth2/platformtoken',
        });
      });
    });

    it('caps the Privilege Cloud URL at 2048 characters', () => {
      const schema = Idira.schema;
      if (!schema) {
        throw new Error('the connector defines no config schema');
      }
      const atLimit = `${API_URL}/${'a'.repeat(2048 - API_URL.length - 1)}`;
      expect(atLimit).toHaveLength(2048);
      expect(schema.safeParse({ apiUrl: atLimit }).success).toBe(true);
      expect(schema.safeParse({ apiUrl: `${atLimit}a` }).success).toBe(false);
    });
  });

  describe('token expiry', () => {
    const secret = {
      tokenUrl: 'https://abc1234.id.cyberark.cloud/oauth2/platformtoken',
      clientId: 'svc-kibana@acme',
      clientSecret: 'client-secret',
      tokenEndpointAuthMethod: 'client_secret_post' as const,
      tokenType: 'Bearer',
    };
    const configuredClient = async (getToken: jest.Mock, request: jest.Mock) => {
      const client = { defaults: { headers: { common: {} } }, request } as unknown as AxiosInstance;
      const authCtx = {
        getCustomHostSettings: () => undefined,
        getToken,
        logger: { debug: jest.fn() },
        sslSettings: {},
      } as unknown as AuthContext;
      return OAuth.configure(authCtx, client, secret);
    };

    it('fails a 401 with an auth error without replaying it; the next call uses a new token', async () => {
      // Kibana caches the token until it expires and deletes it after a 4xx answer; the next
      // execution then asks getToken again and receives a new token. ActionContext offers no
      // refresh hook, so the connector cannot replay the failed request with a new token.
      const getToken = jest
        .fn()
        .mockResolvedValueOnce('Bearer expired-token')
        .mockResolvedValueOnce('Bearer new-token');

      const first = jest
        .fn()
        .mockRejectedValue(httpError(401, { ErrorCode: 'ITATS401E', ErrorMessage: 'expired' }));
      const firstCtx = { ...createContext().ctx, client: await configuredClient(getToken, first) };
      expect(firstCtx.client.defaults.headers.common.Authorization).toBe('Bearer expired-token');
      await expect(run('listAccounts', firstCtx, {})).rejects.toThrow(
        'Authentication failed for GET /PasswordVault/API/Accounts (HTTP 401 ITATS401E: expired). Check the token URL (your identity tenant), the client ID and the client secret. The cached token was discarded, so the next call requests a new one.'
      );
      expect(first).toHaveBeenCalledTimes(1);

      const second = jest
        .fn()
        .mockResolvedValue({ status: 200, data: { value: [ACCOUNT], count: 1 } });
      const secondCtx = {
        ...createContext().ctx,
        client: await configuredClient(getToken, second),
      };
      expect(getToken).toHaveBeenCalledTimes(2);
      expect(secondCtx.client.defaults.headers.common.Authorization).toBe('Bearer new-token');
      await expect(run('listAccounts', secondCtx, {})).resolves.toMatchObject({
        value: [{ id: '12_3' }],
        count: 1,
      });
      expect(second).toHaveBeenCalledTimes(1);
    });
  });

  describe('test handler', () => {
    it('lists one account and reports success', async () => {
      const { ctx, request } = createContext();
      request.mockResolvedValue({ status: 200, data: { value: [], count: 0 } });

      await expect(Idira.test.handler(ctx)).resolves.toEqual({
        message: 'Connected to Idira Privilege Cloud.',
      });
      expect(sent(request)).toEqual({
        method: 'GET',
        url: `${BASE}/Accounts`,
        params: { limit: 1 },
        data: undefined,
      });
    });

    it('fails when the credentials are rejected', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(401, { ErrorCode: 'ITATS401E' }));

      await expect(Idira.test.handler(ctx)).rejects.toThrow('Authentication failed');
    });

    it('fails when the service user has no API access', async () => {
      const { ctx, request } = createContext();
      request.mockRejectedValue(httpError(403));

      await expect(Idira.test.handler(ctx)).rejects.toThrow('Forbidden');
    });
  });
});
