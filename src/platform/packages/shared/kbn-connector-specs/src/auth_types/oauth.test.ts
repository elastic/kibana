/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AxiosInstance } from 'axios';
import type { AuthContext } from '../connector_spec';
import { OAuth } from './oauth';

const ACCESS_TOKEN = 'Bearer abc123';

const SECRETS = {
  tokenUrl: 'https://example.com/oauth/token',
  clientId: 'test-client-id',
  clientSecret: 'test-client-secret',
  scope: 'read',
};

const EXPECTED_TOKEN_OPTS = {
  authType: 'oauth',
  tokenUrl: SECRETS.tokenUrl,
  scope: SECRETS.scope,
  clientId: SECRETS.clientId,
  clientSecret: SECRETS.clientSecret,
  tokenEndpointAuthMethod: 'client_secret_post',
  tokenType: undefined,
};

const createMockAxiosInstance = (): AxiosInstance =>
  ({ defaults: { headers: { common: {} } } } as unknown as AxiosInstance);

const createMockContext = (overrides: Partial<AuthContext> = {}): AuthContext =>
  ({
    getToken: jest.fn().mockResolvedValue(ACCESS_TOKEN),
    ...overrides,
  } as unknown as AuthContext);

describe('OAuth (client credentials)', () => {
  it('has the expected id', () => {
    expect(OAuth.id).toBe('oauth_client_credentials');
  });

  describe('configure', () => {
    it('calls ctx.getToken and sets the Authorization default', async () => {
      const ctx = createMockContext();

      const result = await OAuth.configure(ctx, createMockAxiosInstance(), SECRETS);

      expect(ctx.getToken).toHaveBeenCalledWith(EXPECTED_TOKEN_OPTS);
      expect(result.defaults.headers.common.Authorization).toBe(ACCESS_TOKEN);
    });

    it('throws when getToken resolves to null', async () => {
      const ctx = createMockContext({ getToken: jest.fn().mockResolvedValue(null) });

      await expect(OAuth.configure(ctx, createMockAxiosInstance(), SECRETS)).rejects.toThrow(
        'Unable to retrieve new access token'
      );
    });
  });

  describe('getAuthHeaders', () => {
    it('passes the same getToken opts as configure and returns the Authorization header', async () => {
      const ctx = createMockContext();

      const headers = await OAuth.getAuthHeaders?.(ctx, SECRETS);

      expect(ctx.getToken).toHaveBeenCalledWith(EXPECTED_TOKEN_OPTS);
      expect(headers).toEqual({ Authorization: ACCESS_TOKEN });
    });

    it('honors tokenEndpointAuthMethod and tokenType overrides', async () => {
      const ctx = createMockContext();

      await OAuth.getAuthHeaders?.(ctx, {
        ...SECRETS,
        tokenEndpointAuthMethod: 'client_secret_basic',
        tokenType: 'Bearer',
      });

      expect(ctx.getToken).toHaveBeenCalledWith({
        ...EXPECTED_TOKEN_OPTS,
        tokenEndpointAuthMethod: 'client_secret_basic',
        tokenType: 'Bearer',
      });
    });

    it('wraps getToken failures', async () => {
      const ctx = createMockContext({
        getToken: jest.fn().mockRejectedValue(new Error('invalid_client')),
      });

      await expect(OAuth.getAuthHeaders?.(ctx, SECRETS)).rejects.toThrow(
        'Unable to retrieve/refresh the access token: invalid_client'
      );
    });

    it('throws when getToken resolves to null', async () => {
      const ctx = createMockContext({ getToken: jest.fn().mockResolvedValue(null) });

      await expect(OAuth.getAuthHeaders?.(ctx, SECRETS)).rejects.toThrow(
        'Unable to retrieve new access token'
      );
    });
  });
});
