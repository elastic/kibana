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
import { CoreSetup, Toasts } from '@kbn/core-di-browser';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { loadNotifications } from './notifications';

describe('loadNotifications', () => {
  let container: Container;
  let notifications: ReturnType<typeof notificationServiceMock.createSetupContract>;

  beforeEach(() => {
    notifications = notificationServiceMock.createSetupContract();
    container = injectionServiceMock.createStartContract().getContainer();
    container.load(new ContainerModule(loadNotifications));
    container.bind(CoreSetup('notifications')).toConstantValue(notifications);
  });

  it('should resolve the toasts service', () => {
    expect(container.get(Toasts)).toBe(notifications.toasts);
  });
});
