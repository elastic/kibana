/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Container, ContainerModule } from 'inversify';
import { injectionServiceMock } from '@kbn/core-di-mocks';
import {
  CoreStart,
  Request,
  UserProfileAccessor,
  UserProfileIdAccessor,
} from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { UserProfileWithSecurity } from '@kbn/core-user-profile-common';
import { userProfileServiceMock } from '@kbn/core-user-profile-server-mocks';
import { loadUserProfile } from './user_profile';

describe('loadUserProfile', () => {
  let injection: jest.Mocked<ReturnType<typeof injectionServiceMock.createStartContract>>;
  let container: Container;
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;
  let profile: UserProfileWithSecurity;
  let request: KibanaRequest;

  beforeEach(() => {
    jest.clearAllMocks();
    injection = injectionServiceMock.createStartContract();
    profile = { uid: 'jesuswr123' } as UserProfileWithSecurity;
    userProfile = userProfileServiceMock.createStart();
    userProfile.getCurrent.mockResolvedValue(profile);
    userProfile.getCurrentProfileId.mockResolvedValue(profile.uid);
    request = httpServerMock.createKibanaRequest();
    container = injection.getContainer();
    container.load(new ContainerModule(loadUserProfile));
    container.bind(CoreStart('userProfile')).toConstantValue(userProfile);
    container.bind(Request).toConstantValue(request);
  });

  it('should not retrieve the user profile when resolving the accessor', () => {
    container.get(UserProfileAccessor);

    expect(userProfile.getCurrent).not.toHaveBeenCalled();
  });

  it('should retrieve the user profile for the current request', async () => {
    const userProfileAccessor = container.get(UserProfileAccessor);
    await expect(userProfileAccessor()).resolves.toBe(profile);
    expect(userProfile.getCurrent).toHaveBeenCalledWith({ request });
  });

  it('should pass the options through to the user profile service', async () => {
    await container.get(UserProfileAccessor)({ dataPath: 'something' });

    expect(userProfile.getCurrent).toHaveBeenCalledWith({ request, dataPath: 'something' });
  });

  it('should create the user profile accessor only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(UserProfileAccessor)).toBe(fork.get(UserProfileAccessor));
  });

  it('should not retrieve the profile identifier when resolving the accessor', () => {
    container.get(UserProfileIdAccessor);

    expect(userProfile.getCurrentProfileId).not.toHaveBeenCalled();
  });

  it('should retrieve the profile identifier for the current request', async () => {
    const userProfileIdAccessor = container.get(UserProfileIdAccessor);
    await expect(userProfileIdAccessor()).resolves.toBe('jesuswr123');
    expect(userProfile.getCurrentProfileId).toHaveBeenCalledWith({ request });
  });

  it('should create the profile identifier accessor only once per scope', () => {
    const fork = injection.fork();

    expect(fork.get(UserProfileIdAccessor)).toBe(fork.get(UserProfileIdAccessor));
  });
});
