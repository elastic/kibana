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
import { OAuthClientCertificate } from './oauth_client_certificate';

const TOKEN_URL = 'https://login.microsoftonline.com/test-tenant/oauth2/v2.0/token';
const CLIENT_ID = 'test-client-id';
const MOCK_CERT = '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----';
const MOCK_KEY = '-----BEGIN PRIVATE KEY-----\nMOCK\n-----END PRIVATE KEY-----';

describe('OAuthClientCertificate', () => {
  describe('auth type spec', () => {
    it('should have the correct id', () => {
      expect(OAuthClientCertificate.id).toBe('oauth_client_certificate');
    });

    it('should validate required schema fields', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional passphrase', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
        passphrase: 'my-passphrase',
      });
      expect(result.success).toBe(true);
    });

    it('should accept optional scope', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
        scope: 'https://graph.microsoft.com/.default',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing certificate', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        privateKey: MOCK_KEY,
      });
      expect(result.success).toBe(false);
    });

    it('should reject missing privateKey', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid tokenUrl', () => {
      const result = OAuthClientCertificate.schema.safeParse({
        tokenUrl: 'not-a-url',
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('configure', () => {
    const mockGetToken = jest.fn();
    const mockBuildClientAssertion = jest.fn();
    const mockCtx = {
      buildClientAssertion: mockBuildClientAssertion,
      getCustomHostSettings: jest.fn(),
      getToken: mockGetToken,
      logger: { debug: jest.fn(), error: jest.fn(), warn: jest.fn() },
      sslSettings: {},
    } as unknown as AuthContext;

    beforeEach(() => {
      jest.clearAllMocks();
      mockBuildClientAssertion.mockReturnValue('mock-jwt-assertion');
    });

    it('should call buildClientAssertion with certificate fields', async () => {
      mockGetToken.mockResolvedValue('Bearer test-access-token');

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await OAuthClientCertificate.configure(mockCtx, instance, {
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
        passphrase: 'test-passphrase',
      });

      expect(mockBuildClientAssertion).toHaveBeenCalledWith({
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
        passphrase: 'test-passphrase',
      });
    });

    it('should call getToken with client_assertion and client_assertion_type', async () => {
      mockGetToken.mockResolvedValue('Bearer test-access-token');

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await OAuthClientCertificate.configure(mockCtx, instance, {
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
      });

      expect(mockGetToken).toHaveBeenCalledTimes(1);
      const callArgs = mockGetToken.mock.calls[0][0];
      expect(callArgs.tokenUrl).toBe(TOKEN_URL);
      expect(callArgs.clientId).toBe(CLIENT_ID);
      expect(callArgs.clientSecret).toBeUndefined();
      expect(callArgs.additionalFields.client_assertion_type).toBe(
        'urn:ietf:params:oauth:client-assertion-type:jwt-bearer'
      );
      expect(callArgs.additionalFields.client_assertion).toBe('mock-jwt-assertion');
    });

    it('should set Authorization header on the axios instance', async () => {
      mockGetToken.mockResolvedValue('Bearer test-access-token');

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      const result = await OAuthClientCertificate.configure(mockCtx, instance, {
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
      });

      expect(result.defaults.headers.common.Authorization).toBe('Bearer test-access-token');
    });

    it('should throw when getToken returns null', async () => {
      mockGetToken.mockResolvedValue(null);

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await expect(
        OAuthClientCertificate.configure(mockCtx, instance, {
          tokenUrl: TOKEN_URL,
          clientId: CLIENT_ID,
          certificate: MOCK_CERT,
          privateKey: MOCK_KEY,
        })
      ).rejects.toThrow('Unable to retrieve new access token');
    });

    it('should throw when getToken rejects', async () => {
      mockGetToken.mockRejectedValue(new Error('Token endpoint down'));

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await expect(
        OAuthClientCertificate.configure(mockCtx, instance, {
          tokenUrl: TOKEN_URL,
          clientId: CLIENT_ID,
          certificate: MOCK_CERT,
          privateKey: MOCK_KEY,
        })
      ).rejects.toThrow('Unable to retrieve/refresh the access token: Token endpoint down');
    });

    it('should throw when buildClientAssertion throws', async () => {
      mockBuildClientAssertion.mockImplementation(() => {
        throw new Error('Invalid certificate');
      });

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await expect(
        OAuthClientCertificate.configure(mockCtx, instance, {
          tokenUrl: TOKEN_URL,
          clientId: CLIENT_ID,
          certificate: MOCK_CERT,
          privateKey: MOCK_KEY,
        })
      ).rejects.toThrow('Unable to retrieve/refresh the access token: Invalid certificate');
    });

    it('should pass scope to getToken when provided', async () => {
      mockGetToken.mockResolvedValue('Bearer scoped-token');

      const instance = {
        defaults: { headers: { common: {} as Record<string, unknown> } },
      } as unknown as AxiosInstance;

      await OAuthClientCertificate.configure(mockCtx, instance, {
        tokenUrl: TOKEN_URL,
        clientId: CLIENT_ID,
        certificate: MOCK_CERT,
        privateKey: MOCK_KEY,
        scope: 'https://graph.microsoft.com/.default',
      });

      expect(mockGetToken.mock.calls[0][0].scope).toBe('https://graph.microsoft.com/.default');
    });
  });
});
