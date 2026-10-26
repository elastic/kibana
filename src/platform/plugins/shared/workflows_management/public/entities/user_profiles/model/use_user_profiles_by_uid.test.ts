/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { getExecutedByLabel } from './use_user_profiles_by_uid';

const createProfile = (user: UserProfileWithAvatar['user']): UserProfileWithAvatar => ({
  uid: 'u_alice',
  enabled: true,
  user,
  data: {},
});

describe('getExecutedByLabel', () => {
  it('prefers the full name over the username', () => {
    const profile = createProfile({ username: 'alice', full_name: 'Alice Doe' });

    expect(getExecutedByLabel(profile, 'u_alice')).toBe('Alice Doe');
  });

  it('uses the username when there is no full name', () => {
    const profile = createProfile({ username: 'elastic' });

    expect(getExecutedByLabel(profile, 'u_alice')).toBe('elastic');
  });

  it('returns the fallback when there is no profile', () => {
    expect(getExecutedByLabel(undefined, 'u_alice')).toBe('u_alice');
    expect(getExecutedByLabel(undefined)).toBeUndefined();
  });

  it('returns the fallback when the display name is empty', () => {
    const profile = createProfile({ username: '' });

    expect(getExecutedByLabel(profile, 'u_alice')).toBe('u_alice');
  });
});
