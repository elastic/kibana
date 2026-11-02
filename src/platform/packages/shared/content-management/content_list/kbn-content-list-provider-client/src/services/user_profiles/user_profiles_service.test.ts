/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { UserProfileServiceStart } from '@kbn/core-user-profile-browser';
import { createUserProfilesService } from './user_profiles_service';

describe('createUserProfilesService', () => {
  const buildUserProfile = (userProfile: jest.Mock) =>
    ({ bulkGet: userProfile } as unknown as UserProfileServiceStart);

  it('short-circuits with an empty array when no uids are supplied', async () => {
    const bulkGet = jest.fn();

    const service = createUserProfilesService(buildUserProfile(bulkGet));

    await expect(service.bulkResolve([])).resolves.toEqual([]);
    expect(bulkGet).not.toHaveBeenCalled();
  });

  it('forwards the uids and `dataPath: "avatar"` to `bulkGet` and reshapes the response', async () => {
    const avatar = { initials: 'AB', color: '#000' };
    const bulkGet = jest.fn().mockResolvedValue([
      {
        uid: 'u1',
        user: { username: 'alice', email: 'alice@example.com', full_name: 'Alice Smith' },
        data: { avatar },
      },
      {
        uid: 'u2',
        user: { username: 'bob' },
        data: undefined,
      },
    ]);

    const service = createUserProfilesService(buildUserProfile(bulkGet));
    const result = await service.bulkResolve(['u1', 'u2']);

    expect(bulkGet).toHaveBeenCalledTimes(1);
    const [params] = bulkGet.mock.calls[0];
    expect(params.dataPath).toBe('avatar');
    expect(params.uids).toBeInstanceOf(Set);
    expect(Array.from(params.uids as Set<string>)).toEqual(['u1', 'u2']);

    expect(result).toEqual([
      {
        uid: 'u1',
        user: { username: 'alice', email: 'alice@example.com', full_name: 'Alice Smith' },
        avatar,
        email: 'alice@example.com',
        fullName: 'Alice Smith',
      },
      {
        uid: 'u2',
        user: { username: 'bob' },
        avatar: undefined,
        email: '',
        fullName: 'bob',
      },
    ]);
  });
});
