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
import { VaultAppRoleAuth } from './vault_approle_server';

const CANARY = 'CANARY-9f3e2ab1-do-not-log';

describe('VaultAppRoleAuth.configure (server)', () => {
  const makeCtx = (getToken: jest.Mock): AuthContext =>
    ({
      getCustomHostSettings: jest.fn(),
      getToken,
      logger: { debug: jest.fn() } as never,
      sslSettings: {},
    } as unknown as AuthContext);

  const makeAxiosInstance = (): AxiosInstance =>
    ({ defaults: { headers: { common: {} } } } as unknown as AxiosInstance);

  const secret = {
    address: 'https://vault.example.com:8200',
    namespace: 'team-a',
    mountPath: 'approle',
    roleId: 'the-role-id',
    secretId: 'the-secret-id',
  };

  it('requests a vault_approle token and sets it on the X-Vault-Token header', async () => {
    const getToken = jest.fn().mockResolvedValue('s.abc123');
    const axiosInstance = makeAxiosInstance();

    const result = await VaultAppRoleAuth.configure(makeCtx(getToken), axiosInstance, secret);

    expect(getToken).toHaveBeenCalledWith({
      authType: 'vault_approle',
      address: 'https://vault.example.com:8200',
      namespace: 'team-a',
      mountPath: 'approle',
      roleId: 'the-role-id',
      secretId: 'the-secret-id',
    });
    expect(result.defaults.headers.common['X-Vault-Token']).toBe('s.abc123');
  });

  it('throws a generic error, never the underlying message, when getToken rejects', async () => {
    const getToken = jest.fn().mockRejectedValue(new Error(`upstream failure: ${CANARY}`));

    await expect(
      VaultAppRoleAuth.configure(makeCtx(getToken), makeAxiosInstance(), secret)
    ).rejects.toThrow('Unable to authenticate to Vault via AppRole.');

    try {
      await VaultAppRoleAuth.configure(makeCtx(getToken), makeAxiosInstance(), secret);
    } catch (error) {
      expect((error as Error).message).not.toContain(CANARY);
    }
  });

  it('throws when getToken resolves to null', async () => {
    const getToken = jest.fn().mockResolvedValue(null);

    await expect(
      VaultAppRoleAuth.configure(makeCtx(getToken), makeAxiosInstance(), secret)
    ).rejects.toThrow('Unable to authenticate to Vault via AppRole.');
  });
});
