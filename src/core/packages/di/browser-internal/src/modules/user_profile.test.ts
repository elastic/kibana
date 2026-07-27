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
import { CoreStart, UserProfile } from '@kbn/core-di-browser';
import { userProfileServiceMock } from '@kbn/core-user-profile-browser-mocks';
import { loadUserProfile } from './user_profile';

describe('loadUserProfile', () => {
  let container: Container;
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;

  beforeEach(() => {
    userProfile = userProfileServiceMock.createStart();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadUserProfile));
    container.bind(CoreStart('userProfile')).toConstantValue(userProfile);
  });

  it('should resolve the user profile service', () => {
    expect(container.get(UserProfile)).toBe(userProfile);
  });
});
