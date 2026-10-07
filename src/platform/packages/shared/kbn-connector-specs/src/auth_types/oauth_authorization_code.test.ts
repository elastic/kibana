/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import axios from 'axios';
import type { AuthContext } from '../connector_spec';
import { ConnectorAuthorizationError } from '../errors';
import { OAuthAuthorizationCode } from './oauth_authorization_code';

const baseSecret = {
  authorizationUrl: 'https://app.example.com/oauth/authorize',
  tokenUrl: 'https://api.example.com/oauth/v1/token',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  scope: 'read write',
};

const makeCtx = (getToken: jest.Mock): AuthContext =>
  ({
    logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
    getCustomHostSettings: () => undefined,
    getToken,
    proxySettings: undefined,
    sslSettings: { verificationMode: 'full' as const },
  } as unknown as AuthContext);

describe('OAuthAuthorizationCode.configure', () => {
  describe('tokenEndpointAuthMethod based on useBasicAuth', () => {
    it('passes client_secret_basic when useBasicAuth is true', async () => {
      const getToken = jest.fn().mockResolvedValue('Bearer access-token');
      await OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
        ...baseSecret,
        useBasicAuth: true,
      });

      expect(getToken).toHaveBeenCalledWith(
        expect.objectContaining({ tokenEndpointAuthMethod: 'client_secret_basic' })
      );
    });

    it('passes client_secret_post when useBasicAuth is false', async () => {
      const getToken = jest.fn().mockResolvedValue('Bearer access-token');
      await OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
        ...baseSecret,
        useBasicAuth: false,
      });

      expect(getToken).toHaveBeenCalledWith(
        expect.objectContaining({ tokenEndpointAuthMethod: 'client_secret_post' })
      );
    });

    it('passes client_secret_basic when useBasicAuth is undefined', async () => {
      // useBasicAuth is typed as optional — this exercises the `?? true` fallback in configure.
      // In practice Zod fills in the default(true) before reaching configure, so this is a
      // defensive code path, but it still documents the intended default.
      const getToken = jest.fn().mockResolvedValue('Bearer access-token');
      await OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
        ...baseSecret,
        useBasicAuth: undefined,
      });

      expect(getToken).toHaveBeenCalledWith(
        expect.objectContaining({ tokenEndpointAuthMethod: 'client_secret_basic' })
      );
    });
  });

  describe('Authorization header', () => {
    it('sets the Authorization header on the axios instance from the token', async () => {
      const getToken = jest.fn().mockResolvedValue('Bearer my-access-token');
      const axiosInstance = axios.create();

      await OAuthAuthorizationCode.configure(makeCtx(getToken), axiosInstance, {
        ...baseSecret,
        useBasicAuth: true,
      });

      expect(axiosInstance.defaults.headers.common.Authorization).toBe('Bearer my-access-token');
    });

    it('returns the same axios instance it was given', async () => {
      const getToken = jest.fn().mockResolvedValue('Bearer token');
      const axiosInstance = axios.create();

      const result = await OAuthAuthorizationCode.configure(makeCtx(getToken), axiosInstance, {
        ...baseSecret,
        useBasicAuth: true,
      });

      expect(result).toBe(axiosInstance);
    });
  });

  describe('error handling', () => {
    it('rethrows ConnectorAuthorizationError from getToken without wrapping', async () => {
      const authError = new ConnectorAuthorizationError({
        authMethod: 'oauth_authorization_code',
        reason: 'token_expired',
        message: 'Token expired',
      });
      const getToken = jest.fn().mockRejectedValue(authError);

      await expect(
        OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
          ...baseSecret,
          useBasicAuth: true,
        })
      ).rejects.toBe(authError);
    });

    it('wraps a generic getToken error with a user-facing message', async () => {
      const getToken = jest.fn().mockRejectedValue(new Error('network failure'));

      await expect(
        OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
          ...baseSecret,
          useBasicAuth: true,
        })
      ).rejects.toThrow('Unable to retrieve/refresh the access token');
    });

    it('throws when getToken returns null (user has not completed OAuth flow)', async () => {
      const getToken = jest.fn().mockResolvedValue(null);

      await expect(
        OAuthAuthorizationCode.configure(makeCtx(getToken), axios.create(), {
          ...baseSecret,
          useBasicAuth: true,
        })
      ).rejects.toThrow('No access token available');
    });
  });
});
