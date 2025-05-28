/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { NotificationCoordinator } from '@kbn/core-notifications-browser';
import { Observable, ObservedValueOf } from 'rxjs';

export function createNotificationCoordinatorMock() {
  const notificationCoordinatorMock = jest.fn();

  notificationCoordinatorMock.mockReturnValue({
    optInToCoordination: jest.fn((input$, cb) => input$),
    acquireLock: jest.fn(),
    releaseLock: jest.fn(),
    lock$: new Observable<ObservedValueOf<ReturnType<NotificationCoordinator>['lock$']>>(),
  } satisfies ReturnType<NotificationCoordinator>);

  return notificationCoordinatorMock;
}
