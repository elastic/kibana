/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import {
  executedByFallbackLabel,
  getExecutedByLabel,
  getExecutedByProfiles,
} from './executed_by_profiles';

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

describe('getExecutedByProfiles', () => {
  it('indexes the resolved profiles by the executedBy value of each execution', () => {
    const profile = createProfile({ username: 'alice' });

    const profiles = getExecutedByProfiles([
      { executedBy: 'u_alice', executedByProfile: profile },
      { executedBy: 'u_alice', executedByProfile: profile },
      { executedBy: 'bob' },
      {},
    ]);

    expect(Array.from(profiles.entries())).toEqual([['u_alice', profile]]);
  });
});

describe('executedByFallbackLabel', () => {
  it('keeps a service account id when unresolved profile UIDs are hidden', () => {
    expect(executedByFallbackLabel('sa-nightshift-relay', false)).toBe('sa-nightshift-relay');
  });

  it('hides an unresolved profile UID', () => {
    expect(executedByFallbackLabel('u_mGBROF_q5bm_A5E_0', false)).toBeUndefined();
  });

  it('keeps a profile UID when unresolved executors are shown', () => {
    expect(executedByFallbackLabel('u_mGBROF_q5bm_A5E_0', true)).toBe('u_mGBROF_q5bm_A5E_0');
  });

  it('hides the missing-identity sentinel when unresolved profile UIDs are hidden', () => {
    expect(executedByFallbackLabel('unknown', false)).toBeUndefined();
  });

  it('keeps the missing-identity sentinel when unresolved executors are shown', () => {
    expect(executedByFallbackLabel('unknown', true)).toBe('unknown');
  });
});
