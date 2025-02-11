/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type {
  UserSettingsService,
  InternalUserSettingsServiceSetup,
} from '@kbn/core-user-settings-server-internal';

const createSetupContractMock = (): jest.Mocked<InternalUserSettingsServiceSetup> => {
  return {
    getUserSettingDarkMode: jest.fn(),
  };
};

const createMock = (): jest.Mocked<PublicMethodsOf<UserSettingsService>> => {
  const mock = {
    setup: jest.fn(),
    start: jest.fn(),
  };
  mock.setup.mockReturnValue(createSetupContractMock());
  return mock;
};

export const userSettingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
