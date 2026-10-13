/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { securityServiceMock } from '@kbn/core/server/mocks';
import { getAuthenticatedUser } from './get_user';

const createRequest = (): KibanaRequest => ({ headers: {} } as KibanaRequest);

const createClusterClient = (): IClusterClient =>
  ({
    asScoped: jest.fn(),
  } as unknown as IClusterClient);

const createSecurity = (user: unknown): SecurityServiceStart =>
  ({
    authc: {
      getPrincipal: jest.fn(),
      getCurrentUser: jest.fn().mockReturnValue(user),
    },
  } as unknown as SecurityServiceStart);

describe('getAuthenticatedUser', () => {
  it('identifies a service-account principal without authenticating an expired temporary request', async () => {
    const security = securityServiceMock.createStart();
    security.authc.getPrincipal.mockReturnValue({
      type: 'service_account',
      serviceAccountId: 'account-a',
      variant: 'stack',
    });
    const client = createClusterClient();
    await expect(getAuthenticatedUser(createRequest(), security, client)).resolves.toBe(
      'account-a'
    );
    expect(client.asScoped).not.toHaveBeenCalled();
    expect(security.authc.getCurrentUser).not.toHaveBeenCalled();
  });

  it('returns the profile UID when available', async () => {
    await expect(
      getAuthenticatedUser(
        createRequest(),
        createSecurity({ username: 'elastic', profile_uid: 'u_profile_1' }),
        createClusterClient()
      )
    ).resolves.toBe('u_profile_1');
  });

  it('falls back to the username when the profile UID is unavailable', async () => {
    await expect(
      getAuthenticatedUser(
        createRequest(),
        createSecurity({ username: 'elastic' }),
        createClusterClient()
      )
    ).resolves.toBe('elastic');
  });

  it('returns the username even when it is the string unknown', async () => {
    await expect(
      getAuthenticatedUser(
        createRequest(),
        createSecurity({ username: 'unknown' }),
        createClusterClient()
      )
    ).resolves.toBe('unknown');
  });

  it('returns undefined when no user or API key identity can be resolved', async () => {
    await expect(
      getAuthenticatedUser(createRequest(), createSecurity(null), createClusterClient())
    ).resolves.toBeUndefined();
  });
});
