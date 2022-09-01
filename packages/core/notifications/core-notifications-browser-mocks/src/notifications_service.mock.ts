/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { MockedKeys } from '@kbn/utility-types-jest';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { NotificationsServiceContract } from '@kbn/core-notifications-browser-internal';
import { toastsServiceMock } from './toasts_service.mock';

const createSetupContractMock = () => {
  const setupContract: MockedKeys<NotificationsSetup> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: toastsServiceMock.createSetupContract(),
  };
  return setupContract;
};

const createStartContractMock = () => {
  const startContract: MockedKeys<NotificationsStart> = {
    // we have to suppress type errors until decide how to mock es6 class
    toasts: toastsServiceMock.createStartContract(),
  };
  return startContract;
};

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
