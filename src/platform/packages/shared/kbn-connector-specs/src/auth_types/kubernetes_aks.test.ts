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
import { KubernetesAksAuth } from './kubernetes_aks_server';

const SECRET = {
  tenantId: '11111111-2222-3333-4444-555555555555',
  clientId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
  clientSecret: 'super-secret',
};

const createMockAxiosInstance = () =>
  ({
    defaults: { headers: { common: {} } },
    interceptors: { request: { clear: jest.fn(), use: jest.fn() } },
  } as unknown as AxiosInstance);

const createMockContext = (getToken: jest.Mock) =>
  ({
    getToken,
    getCustomHostSettings: jest.fn(),
    logger: { debug: jest.fn(), warn: jest.fn() },
    sslSettings: {},
  } as unknown as AuthContext);

describe('KubernetesAksAuth', () => {
  it('has the expected id and schema fields', () => {
    expect(KubernetesAksAuth.id).toBe('kubernetes_aks');
    const shape = KubernetesAksAuth.schema.shape;
    expect(shape).toHaveProperty('tenantId');
    expect(shape).toHaveProperty('clientId');
    expect(shape).toHaveProperty('clientSecret');
    expect(shape).toHaveProperty('caCert');
    expect(shape).toHaveProperty('verificationMode');
  });

  it('requests an Entra token for the AKS server app and sets it as Authorization', async () => {
    const getToken = jest.fn().mockResolvedValue('Bearer entra-access-token');
    const axiosInstance = createMockAxiosInstance();

    await KubernetesAksAuth.configure(createMockContext(getToken), axiosInstance, SECRET);

    expect(getToken).toHaveBeenCalledWith({
      authType: 'oauth',
      tokenUrl:
        'https://login.microsoftonline.com/11111111-2222-3333-4444-555555555555/oauth2/v2.0/token',
      scope: '6dae42f8-4368-4678-94ff-3960e28e3630/.default',
      clientId: SECRET.clientId,
      clientSecret: SECRET.clientSecret,
      tokenEndpointAuthMethod: 'client_secret_post',
    });
    expect(axiosInstance.defaults.headers.common.Authorization).toBe('Bearer entra-access-token');
  });

  it('throws a helpful error when the token request fails', async () => {
    const getToken = jest.fn().mockRejectedValue(new Error('invalid_client'));
    const axiosInstance = createMockAxiosInstance();

    await expect(
      KubernetesAksAuth.configure(createMockContext(getToken), axiosInstance, SECRET)
    ).rejects.toThrow('Unable to retrieve an access token for AKS: invalid_client');
  });

  it('throws when no token is returned', async () => {
    const getToken = jest.fn().mockResolvedValue(null);
    const axiosInstance = createMockAxiosInstance();

    await expect(
      KubernetesAksAuth.configure(createMockContext(getToken), axiosInstance, SECRET)
    ).rejects.toThrow('Unable to retrieve an access token for AKS');
  });

  it('configures TLS with the pasted cluster CA', async () => {
    const getToken = jest.fn().mockResolvedValue('Bearer entra-access-token');
    const axiosInstance = createMockAxiosInstance();

    await KubernetesAksAuth.configure(createMockContext(getToken), axiosInstance, {
      ...SECRET,
      caCert: '-----BEGIN CERTIFICATE-----\nfake\n-----END CERTIFICATE-----',
      verificationMode: 'full',
    });

    expect(axiosInstance.interceptors.request.clear).toHaveBeenCalled();
    expect(axiosInstance.interceptors.request.use).toHaveBeenCalled();
  });
});
