/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { MockedKeys } from '@kbn/utility-types/jest';
import {
  NotificationsService,
  NotificationsSetup,
  NotificationsStart,
} from './notifications_service';
import { toastsServiceMock } from './toasts/toasts_service.mock';

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

type NotificationsServiceContract = PublicMethodsOf<NotificationsService>;
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
