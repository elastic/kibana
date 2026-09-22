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
import {
  OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
  OAuthClientCredentialsPrivateKeyJwt,
} from './oauth_client_credentials_private_key_jwt';

const TOKEN_URL = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token';
const CLIENT_ID = 'test-client-id';
const ACCESS_TOKEN = 'Bearer abc123';

const PEM_CERT = '-----BEGIN CERTIFICATE-----\nAAAA\n-----END CERTIFICATE-----';
const PEM_KEY = '-----BEGIN PRIVATE KEY-----\nBBBB\n-----END PRIVATE KEY-----';
const PEM_RSA_KEY = '-----BEGIN RSA PRIVATE KEY-----\nBBBB\n-----END RSA PRIVATE KEY-----';
const PEM_ENCRYPTED_KEY =
  '-----BEGIN ENCRYPTED PRIVATE KEY-----\nBBBB\n-----END ENCRYPTED PRIVATE KEY-----';

const SECRETS = {
  tokenUrl: TOKEN_URL,
  clientId: CLIENT_ID,
  scope: 'https://graph.microsoft.com/.default',
  algorithm: 'PS256' as const,
  certificateBinding: 'x5t#S256' as const,
  certificate: PEM_CERT,
  privateKey: PEM_ENCRYPTED_KEY,
  passphrase: 'passphrase',
};

function createMockAxiosInstance(): AxiosInstance {
  return {
    defaults: { headers: { common: {} } },
  } as unknown as AxiosInstance;
}

function createMockContext(overrides: Partial<AuthContext> = {}): AuthContext {
  const ctx: Partial<AuthContext> = {
    getToken: jest.fn().mockResolvedValue(ACCESS_TOKEN),
    logger: {
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      info: jest.fn(),
    } as unknown as AuthContext['logger'],
    getCustomHostSettings: jest.fn(),
    sslSettings: {},
    ...overrides,
  };
  return ctx as AuthContext;
}

describe('OAuthClientCredentialsPrivateKeyJwt', () => {
  it('has the expected id', () => {
    expect(OAuthClientCredentialsPrivateKeyJwt.id).toBe('oauth_client_credentials_private_key_jwt');
  });

  describe('schema', () => {
    it('accepts a valid cert secret payload', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse(SECRETS);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid tokenUrl', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        tokenUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty privateKey', () => {
      const withEmptyKey = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        privateKey: '',
      });
      expect(withEmptyKey.success).toBe(false);
    });

    it('rejects certificate missing PEM markers', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        certificate: 'not a PEM',
      });
      expect(result.success).toBe(false);
    });

    it('rejects privateKey missing PEM markers', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        privateKey: 'not a PEM',
      });
      expect(result.success).toBe(false);
    });

    it('accepts PKCS#1 (RSA PRIVATE KEY) and PKCS#8 keys', () => {
      const pkcs1 = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        privateKey: PEM_RSA_KEY,
        passphrase: undefined,
      });
      expect(pkcs1.success).toBe(true);

      const pkcs8 = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        ...SECRETS,
        privateKey: PEM_KEY,
        passphrase: undefined,
      });
      expect(pkcs8.success).toBe(true);
    });

    it('accepts a kid-bound payload without a certificate', () => {
      const result = OAuthClientCredentialsPrivateKeyJwt.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        algorithm: 'RS256' as const,
        certificateBinding: 'kid' as const,
        keyId: 'my-key-1',
        privateKey: PEM_KEY,
      });
      expect(result.success).toBe(true);
    });

    it('exposes fileUpload widget hints for PEM fields', () => {
      const shape = OAuthClientCredentialsPrivateKeyJwt.schema.shape;
      const certMeta = shape.certificate.meta() ?? {};
      const keyMeta = shape.privateKey.meta() ?? {};
      expect(certMeta.widget).toBe('fileUpload');
      expect(certMeta.widgetOptions).toEqual({ accept: '.pem,.crt' });
      expect(keyMeta.widget).toBe('fileUpload');
      expect(keyMeta.widgetOptions).toEqual({ accept: '.pem,.key' });
      expect(keyMeta.sensitive).toBe(true);
    });

    it('marks tokenUrl for allowedHosts validation', () => {
      const shape = OAuthClientCredentialsPrivateKeyJwt.schema.shape;
      const tokenUrlMeta = shape.tokenUrl.meta() ?? {};
      expect(tokenUrlMeta.validate).toEqual({ allowedHosts: true });
    });
  });

  describe('configure', () => {
    it('delegates to ctx.getToken with the auth-type-discriminated opts', async () => {
      const ctx = createMockContext();
      const axiosInstance = createMockAxiosInstance();

      const result = await OAuthClientCredentialsPrivateKeyJwt.configure(
        ctx,
        axiosInstance,
        SECRETS
      );

      expect(ctx.getToken).toHaveBeenCalledWith({
        authType: OAUTH_CLIENT_CREDENTIALS_PRIVATE_KEY_JWT_ID,
        tokenUrl: SECRETS.tokenUrl,
        scope: SECRETS.scope,
        clientId: SECRETS.clientId,
      });
      expect(result.defaults.headers.common.Authorization).toBe(ACCESS_TOKEN);
    });

    it('wraps getToken failures with tokenUrl context and preserves cause', async () => {
      const rootCause = new Error('invalid_client');
      const ctx = createMockContext({
        getToken: jest.fn().mockRejectedValue(rootCause),
      });
      const axiosInstance = createMockAxiosInstance();

      await expect(
        OAuthClientCredentialsPrivateKeyJwt.configure(ctx, axiosInstance, SECRETS)
      ).rejects.toMatchObject({
        message: expect.stringContaining(SECRETS.tokenUrl),
        cause: rootCause,
      });
    });

    it('throws when getToken resolves to a falsy value', async () => {
      const ctx = createMockContext({
        getToken: jest.fn().mockResolvedValue(null),
      });
      const axiosInstance = createMockAxiosInstance();

      await expect(
        OAuthClientCredentialsPrivateKeyJwt.configure(ctx, axiosInstance, SECRETS)
      ).rejects.toThrow(SECRETS.tokenUrl);
    });
  });
});
