/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { DeeplyMockedKeys } from '@kbn/utility-types-jest';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import { toastsServiceMock } from './toasts_service.mock';
import { createNotificationCoordinatorMock } from './notification_coordinator.mock';

const createSetupContractMock = () => {
  const setupContract: DeeplyMockedKeys<NotificationsSetup> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: toastsServiceMock.createSetupContract(),
    coordinator: createNotificationCoordinatorMock(),
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: DeeplyMockedKeys<NotificationsStart> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: toastsServiceMock.createStartContract(),
    showErrorDialog: jest.fn(),
  };
  return startContract;
};

/**
 * This is declared internally to avoid a circular dependency issue
 */
export interface NotificationsServiceContract {
  setup: typeof createSetupContractMock;
  start: ({ targetDomElement }: { targetDomElement: HTMLElement }) => void;
  stop: () => void;
}

const createMock = () => {
  const mocked: jest.Mocked<NotificationsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const notificationServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
