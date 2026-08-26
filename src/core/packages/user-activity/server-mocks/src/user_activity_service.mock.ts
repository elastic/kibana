/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  UserActivityServiceSetup,
  UserActivityServiceStart,
} from '@kbn/core-user-activity-server';
import type {
  InternalUserActivityServiceSetup,
  InternalUserActivityServiceStart,
} from '@kbn/core-user-activity-server-internal';

const createSetupContractMock = (): jest.Mocked<UserActivityServiceSetup> => {
  return {
    trackUserAction: jest.fn(),
  };
};

const createStartContractMock = (): jest.Mocked<UserActivityServiceStart> => {
  return {
    trackUserAction: jest.fn(),
  };
};

const createInternalSetupContractMock = (): jest.Mocked<InternalUserActivityServiceSetup> => {
  return {
    ...createSetupContractMock(),
    setInjectedContext: jest.fn(),
  };
};

const createInternalStartContractMock = (): jest.Mocked<InternalUserActivityServiceStart> => {
  return {
    ...createStartContractMock(),
    setInjectedContext: jest.fn(),
  };
};

/** Mocks for the UserActivityService contracts. */
export const userActivityServiceMock = {
  /** Creates a mock for {@link InternalUserActivityServiceSetup}. */
  createInternalSetupContract: createInternalSetupContractMock,
  /** Creates a mock for {@link InternalUserActivityServiceStart}. */
  createInternalStartContract: createInternalStartContractMock,
  /** Creates a mock for {@link UserActivityServiceSetup}. */
  createSetupContract: createSetupContractMock,
  /** Creates a mock for {@link UserActivityServiceStart}. */
  createStartContract: createStartContractMock,
};
