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
import { GcpServiceAccountAuth } from './gcp_service_account';
import { parseServiceAccountKey, getGcpAccessToken } from './gcp_jwt_helpers';

jest.mock('./gcp_jwt_helpers', () => {
  const actual = jest.requireActual('./gcp_jwt_helpers');
  return {
    ...actual,
    getGcpAccessToken: jest.fn(),
  };
});

const mockGetGcpAccessToken = getGcpAccessToken as jest.MockedFunction<typeof getGcpAccessToken>;

const VALID_SERVICE_ACCOUNT_JSON = JSON.stringify({
  type: 'service_account',
  project_id: 'my-project',
  private_key_id: 'key-id-123',
  private_key: '-----BEGIN PRIVATE KEY-----\nfake-key\n-----END PRIVATE KEY-----\n',
  client_email: 'test-sa@my-project.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
});

describe('GcpServiceAccountAuth', () => {
  describe('metadata', () => {
    it('should have correct id', () => {
      expect(GcpServiceAccountAuth.id).toBe('gcp_service_account');
    });

    it('should have a schema with serviceAccountJson and scope fields', () => {
      const shape = GcpServiceAccountAuth.schema.shape;
      expect(shape).toHaveProperty('serviceAccountJson');
      expect(shape).toHaveProperty('scope');
    });
  });

  describe('configure', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should set Bearer token on the axios instance', async () => {
      mockGetGcpAccessToken.mockResolvedValue({
        accessToken: 'ya29.mock-access-token',
        expiresAt: Date.now() + 3600000,
      });

      const mockAxiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      await GcpServiceAccountAuth.configure({} as AuthContext, mockAxiosInstance, {
        serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      });

      expect(mockAxiosInstance.defaults.headers.common.Authorization).toBe(
        'Bearer ya29.mock-access-token'
      );

      expect(mockGetGcpAccessToken).toHaveBeenCalledWith(
        'test-sa@my-project.iam.gserviceaccount.com',
        expect.stringContaining('BEGIN PRIVATE KEY'),
        'https://www.googleapis.com/auth/cloud-platform'
      );
    });

    it('should throw when token exchange fails', async () => {
      mockGetGcpAccessToken.mockRejectedValue(
        new Error('Failed to obtain GCP access token (400): invalid_grant')
      );

      const mockAxiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      await expect(
        GcpServiceAccountAuth.configure({} as AuthContext, mockAxiosInstance, {
          serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
        })
      ).rejects.toThrow('Failed to obtain GCP access token');
    });

    it('should use custom scope when provided', async () => {
      mockGetGcpAccessToken.mockResolvedValue({
        accessToken: 'ya29.scoped-token',
        expiresAt: Date.now() + 3600000,
      });

      const mockAxiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      await GcpServiceAccountAuth.configure({} as AuthContext, mockAxiosInstance, {
        serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
        scope: 'https://www.googleapis.com/auth/cloudfunctions',
      });

      expect(mockGetGcpAccessToken).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        'https://www.googleapis.com/auth/cloudfunctions'
      );
    });

    it('should throw on invalid service account JSON', async () => {
      const mockAxiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      await expect(
        GcpServiceAccountAuth.configure({} as AuthContext, mockAxiosInstance, {
          serviceAccountJson: 'not valid json',
        })
      ).rejects.toThrow('Invalid service account JSON: failed to parse');
    });

    it('should throw on wrong type field', async () => {
      const mockAxiosInstance = {
        defaults: { headers: { common: {} } },
      } as unknown as AxiosInstance;

      await expect(
        GcpServiceAccountAuth.configure({} as AuthContext, mockAxiosInstance, {
          serviceAccountJson: JSON.stringify({ type: 'authorized_user' }),
        })
      ).rejects.toThrow('expected type "service_account"');
    });
  });
});

describe('parseServiceAccountKey', () => {
  it('should parse valid service account JSON', () => {
    const key = parseServiceAccountKey(VALID_SERVICE_ACCOUNT_JSON);
    expect(key.type).toBe('service_account');
    expect(key.project_id).toBe('my-project');
    expect(key.client_email).toBe('test-sa@my-project.iam.gserviceaccount.com');
    expect(key.private_key).toContain('BEGIN PRIVATE KEY');
  });

  it('should throw on invalid JSON', () => {
    expect(() => parseServiceAccountKey('not json')).toThrow('failed to parse');
  });

  it('should throw on wrong type', () => {
    expect(() => parseServiceAccountKey(JSON.stringify({ type: 'authorized_user' }))).toThrow(
      'expected type "service_account"'
    );
  });

  it('should throw on missing client_email', () => {
    expect(() =>
      parseServiceAccountKey(JSON.stringify({ type: 'service_account', private_key: '...' }))
    ).toThrow('missing client_email');
  });

  it('should throw on missing private_key', () => {
    expect(() =>
      parseServiceAccountKey(
        JSON.stringify({
          type: 'service_account',
          client_email: 'test@example.iam.gserviceaccount.com',
        })
      )
    ).toThrow('missing private_key');
  });
});
