/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { BehaviorSubject } from 'rxjs';
import type { INotificationEvents, NotificationEvent } from '@kbn/core-notifications-browser';

const createStartContract = (): jest.Mocked<INotificationEvents> => {
  const events$ = new BehaviorSubject<NotificationEvent[]>([]);
  return {
    get$: jest.fn(() => events$.asObservable()),
    registerType: jest.fn().mockReturnValue(jest.fn()),
    notify: jest.fn(),
    markAsRead: jest.fn(),
  };
};

export const eventsServiceMock = {
  createStartContract,
};
