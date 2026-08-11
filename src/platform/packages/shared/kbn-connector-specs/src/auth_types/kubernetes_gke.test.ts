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
import { KubernetesGkeAuth } from './kubernetes_gke_server';
import { getGcpAccessToken } from './gcp_jwt_helpers';

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
  client_email: 'gke-sa@my-project.iam.gserviceaccount.com',
  client_id: '123456789',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
});

const createMockAxiosInstance = () =>
  ({
    defaults: { headers: { common: {} } },
    interceptors: { request: { clear: jest.fn(), use: jest.fn() } },
  } as unknown as AxiosInstance);

const mockContext = {
  getCustomHostSettings: jest.fn(),
  logger: { debug: jest.fn(), warn: jest.fn() },
  sslSettings: {},
} as unknown as AuthContext;

describe('KubernetesGkeAuth', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('has the expected id and schema fields', () => {
    expect(KubernetesGkeAuth.id).toBe('kubernetes_gke');
    const shape = KubernetesGkeAuth.schema.shape;
    expect(shape).toHaveProperty('serviceAccountJson');
    expect(shape).toHaveProperty('caCert');
    expect(shape).toHaveProperty('verificationMode');
  });

  it('exchanges the service account key for a bearer token with GKE scopes', async () => {
    mockGetGcpAccessToken.mockResolvedValue({
      accessToken: 'ya29.gke-token',
      expiresAt: Date.now() + 3600000,
    });
    const axiosInstance = createMockAxiosInstance();

    await KubernetesGkeAuth.configure(mockContext, axiosInstance, {
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
    });

    expect(axiosInstance.defaults.headers.common.Authorization).toBe('Bearer ya29.gke-token');
    expect(mockGetGcpAccessToken).toHaveBeenCalledWith(
      'gke-sa@my-project.iam.gserviceaccount.com',
      expect.stringContaining('BEGIN PRIVATE KEY'),
      'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/userinfo.email'
    );
  });

  it('configures TLS with the pasted cluster CA', async () => {
    mockGetGcpAccessToken.mockResolvedValue({
      accessToken: 'ya29.gke-token',
      expiresAt: Date.now() + 3600000,
    });
    const axiosInstance = createMockAxiosInstance();

    await KubernetesGkeAuth.configure(mockContext, axiosInstance, {
      serviceAccountJson: VALID_SERVICE_ACCOUNT_JSON,
      caCert: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
      verificationMode: 'full',
    });

    expect(axiosInstance.interceptors.request.clear).toHaveBeenCalled();
    expect(axiosInstance.interceptors.request.use).toHaveBeenCalled();
  });

  it('throws on invalid service account JSON', async () => {
    const axiosInstance = createMockAxiosInstance();

    await expect(
      KubernetesGkeAuth.configure(mockContext, axiosInstance, {
        serviceAccountJson: 'not valid json',
      })
    ).rejects.toThrow('Invalid service account JSON: failed to parse');
  });
});
