/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IClusterClient, KibanaRequest, SecurityServiceStart } from '@kbn/core/server';
import { getAuthenticatedUser } from './get_user';

const createRequest = (): KibanaRequest => ({ headers: {} } as KibanaRequest);

const createClusterClient = (): IClusterClient =>
  ({
    asScoped: jest.fn(),
  } as unknown as IClusterClient);

const createSecurity = (user: unknown): SecurityServiceStart =>
  ({
    authc: {
      getCurrentUser: jest.fn().mockReturnValue(user),
    },
  } as unknown as SecurityServiceStart);

describe('getAuthenticatedUser', () => {
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
});
