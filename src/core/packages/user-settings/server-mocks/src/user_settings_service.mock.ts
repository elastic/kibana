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
import { lazyObject } from '@kbn/lazy-object';

const createSetupContractMock = (): jest.Mocked<InternalUserSettingsServiceSetup> => {
  return {
    getUserSettingDarkMode: jest.fn(),
  };
};

const createMock = (): jest.Mocked<PublicMethodsOf<UserSettingsService>> => {
  const mock = lazyObject({
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn(),
  });
  return mock;
};

export const userSettingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
};
