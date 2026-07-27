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
import { CoreSetup, UserActivity } from '@kbn/core-di-server';
import { userActivityServiceMock } from '@kbn/core-user-activity-server-mocks';
import { loadUserActivity } from './user_activity';

describe('loadUserActivity', () => {
  let container: Container;
  let userActivity: ReturnType<typeof userActivityServiceMock.createSetupContract>;

  beforeEach(() => {
    userActivity = userActivityServiceMock.createSetupContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadUserActivity));
    container.bind(CoreSetup('userActivity')).toConstantValue(userActivity);
  });

  it('should resolve the user activity service', () => {
    expect(container.get(UserActivity)).toBe(userActivity);
  });
});
