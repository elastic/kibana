/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { canUserHaveProfile, isUserAnonymous } from './authenticated_user';
import { mockAuthenticatedUser } from './authenticated_user.mock';

describe('isUserAnonymous', () => {
  it('should indicate anonymous user', () => {
    expect(
      isUserAnonymous(
        mockAuthenticatedUser({
          authentication_provider: { type: 'anonymous', name: 'basic1' },
        })
      )
    ).toBe(true);
  });

  it('should indicate non-anonymous user', () => {
    expect(
      isUserAnonymous(
        mockAuthenticatedUser({
          authentication_provider: { type: 'basic', name: 'basic1' },
        })
      )
    ).toBe(false);
  });
});

describe('canUserHaveProfile', () => {
  it('anonymous users cannot have profiles', () => {
    expect(
      canUserHaveProfile(
        mockAuthenticatedUser({
          authentication_provider: { type: 'anonymous', name: 'basic1' },
        })
      )
    ).toBe(false);
  });

  it('proxy authenticated users cannot have profiles', () => {
    expect(
      canUserHaveProfile(
        mockAuthenticatedUser({
          authentication_provider: { type: 'http', name: '__http__' },
        })
      )
    ).toBe(false);
  });

  it('non-anonymous users that can have sessions can have profiles', () => {
    for (const providerType of ['saml', 'oidc', 'basic', 'token', 'pki', 'kerberos']) {
      expect(
        canUserHaveProfile(
          mockAuthenticatedUser({
            authentication_provider: { type: providerType, name: `${providerType}_name` },
          })
        )
      ).toBe(true);
    }
  });
});
