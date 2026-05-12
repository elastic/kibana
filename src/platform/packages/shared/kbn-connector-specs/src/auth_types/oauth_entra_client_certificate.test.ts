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
  CLIENT_ASSERTION_TYPE,
  OAUTH_ENTRA_CLIENT_CERTIFICATE_ID,
  OAuthEntraClientCertificate,
} from './oauth_entra_client_certificate';

const TOKEN_URL = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token';
const CLIENT_ID = 'test-client-id';
const CLIENT_ASSERTION = 'signed.jwt.assertion';
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
    buildClientAssertion: jest.fn().mockReturnValue(CLIENT_ASSERTION),
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

describe('OAuthEntraClientCertificate', () => {
  it('has the expected id', () => {
    expect(OAuthEntraClientCertificate.id).toBe('oauth_entra_client_certificate');
  });

  describe('schema', () => {
    it('accepts a valid cert secret payload', () => {
      const result = OAuthEntraClientCertificate.schema.safeParse(SECRETS);
      expect(result.success).toBe(true);
    });

    it('rejects missing required fields', () => {
      const result = OAuthEntraClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
      });
      expect(result.success).toBe(false);
    });

    it('rejects an invalid tokenUrl', () => {
      const result = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        tokenUrl: 'not-a-url',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty certificate / privateKey', () => {
      const withEmptyCert = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        certificate: '',
      });
      expect(withEmptyCert.success).toBe(false);

      const withEmptyKey = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        privateKey: '',
      });
      expect(withEmptyKey.success).toBe(false);
    });

    it('rejects certificate missing PEM markers', () => {
      const result = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        certificate: 'not a PEM',
      });
      expect(result.success).toBe(false);
    });

    it('rejects privateKey missing PEM markers', () => {
      const result = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        privateKey: 'not a PEM',
      });
      expect(result.success).toBe(false);
    });

    it('accepts PKCS#1 (RSA PRIVATE KEY) and encrypted PKCS#8 keys', () => {
      const pkcs1 = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        privateKey: PEM_RSA_KEY,
        passphrase: undefined,
      });
      expect(pkcs1.success).toBe(true);

      const encrypted = OAuthEntraClientCertificate.schema.safeParse({
        ...SECRETS,
        privateKey: PEM_ENCRYPTED_KEY,
      });
      expect(encrypted.success).toBe(true);
    });

    it('exposes textarea/secretTextarea widget hints for PEM fields', () => {
      const shape = OAuthEntraClientCertificate.schema.shape;
      const certMeta = shape.certificate.meta() ?? {};
      const keyMeta = shape.privateKey.meta() ?? {};
      expect(certMeta.widget).toBe('textarea');
      expect(keyMeta.widget).toBe('secretTextarea');
      expect(keyMeta.sensitive).toBe(true);
    });

    it('marks tokenUrl for allowedHosts validation', () => {
      const shape = OAuthEntraClientCertificate.schema.shape;
      const tokenUrlMeta = shape.tokenUrl.meta() ?? {};
      expect(tokenUrlMeta.validate).toEqual({ allowedHosts: true });
    });
  });

  describe('configure', () => {
    it('builds a JWT assertion and exchanges it for a token', async () => {
      const ctx = createMockContext();
      const axiosInstance = createMockAxiosInstance();

      const result = await OAuthEntraClientCertificate.configure(ctx, axiosInstance, SECRETS);

      expect(ctx.buildClientAssertion).toHaveBeenCalledWith({
        tokenUrl: SECRETS.tokenUrl,
        clientId: SECRETS.clientId,
        certificate: SECRETS.certificate,
        privateKey: SECRETS.privateKey,
        passphrase: SECRETS.passphrase,
      });

      expect(ctx.getToken).toHaveBeenCalledWith({
        authType: OAUTH_ENTRA_CLIENT_CERTIFICATE_ID,
        tokenUrl: SECRETS.tokenUrl,
        scope: SECRETS.scope,
        clientId: SECRETS.clientId,
        additionalFields: {
          client_assertion: CLIENT_ASSERTION,
          client_assertion_type: CLIENT_ASSERTION_TYPE,
        },
      });

      expect(result.defaults.headers.common.Authorization).toBe(ACCESS_TOKEN);
    });

    it('works without an optional passphrase', async () => {
      const ctx = createMockContext();
      const axiosInstance = createMockAxiosInstance();
      const secretsWithoutPassphrase = {
        ...SECRETS,
        privateKey: PEM_KEY,
        passphrase: undefined,
      };

      await OAuthEntraClientCertificate.configure(ctx, axiosInstance, secretsWithoutPassphrase);

      expect(ctx.buildClientAssertion).toHaveBeenCalledWith(
        expect.objectContaining({ passphrase: undefined })
      );
    });

    it('wraps buildClientAssertion errors as EntraAuthError(assertion) with a cause', async () => {
      const rootCause = new Error('Invalid PEM certificate');
      const ctx = createMockContext({
        buildClientAssertion: jest.fn(() => {
          throw rootCause;
        }),
      });
      const axiosInstance = createMockAxiosInstance();

      await expect(
        OAuthEntraClientCertificate.configure(ctx, axiosInstance, SECRETS)
      ).rejects.toMatchObject({
        name: 'EntraAuthError',
        kind: 'assertion',
        message: expect.stringMatching(/Unable to build client assertion/),
        cause: rootCause,
      });

      expect(ctx.getToken).not.toHaveBeenCalled();
    });

    it('wraps token-endpoint failures as EntraAuthError(exchange) with tokenUrl context', async () => {
      const rootCause = new Error('invalid_client');
      const ctx = createMockContext({
        getToken: jest.fn().mockRejectedValue(rootCause),
      });
      const axiosInstance = createMockAxiosInstance();

      await expect(
        OAuthEntraClientCertificate.configure(ctx, axiosInstance, SECRETS)
      ).rejects.toMatchObject({
        name: 'EntraAuthError',
        kind: 'exchange',
        message: expect.stringContaining(SECRETS.tokenUrl),
        cause: rootCause,
      });
    });

    it('throws EntraAuthError(exchange) when getToken resolves to a falsy value', async () => {
      const ctx = createMockContext({
        getToken: jest.fn().mockResolvedValue(null),
      });
      const axiosInstance = createMockAxiosInstance();

      await expect(
        OAuthEntraClientCertificate.configure(ctx, axiosInstance, SECRETS)
      ).rejects.toMatchObject({
        name: 'EntraAuthError',
        kind: 'exchange',
      });
    });
  });
});
