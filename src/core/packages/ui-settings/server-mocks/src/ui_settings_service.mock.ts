/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type {
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
  InternalUiSettingsServicePreboot,
  UiSettingsService,
} from '@kbn/core-ui-settings-server-internal';
import { lazyObject } from '@kbn/lazy-object';

const createClientMock = () => {
  const mocked: jest.Mocked<IUiSettingsClient> = lazyObject({
    getRegistered: jest.fn().mockReturnValue({}),
    get: jest.fn().mockResolvedValue(false),
    getAll: jest.fn().mockResolvedValue({}),
    getUserProvided: jest.fn().mockResolvedValue({}),
    setMany: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    removeMany: jest.fn(),
    isOverridden: jest.fn(),
    isSensitive: jest.fn(),
    validate: jest.fn(),
  });

  return mocked;
};

const createPrebootMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServicePreboot> = lazyObject({
    createDefaultsClient: jest.fn().mockReturnValue(createClientMock()),
  });

  return mocked;
};

const createSetupMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServiceSetup> = lazyObject({
    register: jest.fn(),
    registerGlobal: jest.fn(),
    setAllowlist: jest.fn(),
  });

  return mocked;
};

const createStartMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServiceStart> = {
    asScopedToClient: jest.fn(),
    globalAsScopedToClient: jest.fn(),
  };

  mocked.asScopedToClient.mockReturnValue(createClientMock());

  return mocked;
};

type UiSettingsServiceContract = PublicMethodsOf<UiSettingsService>;
const createMock = () => {
  const mocked: jest.Mocked<UiSettingsServiceContract> = lazyObject({
    preboot: jest.fn().mockResolvedValue(createPrebootMock()),
    setup: jest.fn().mockResolvedValue(createSetupMock()),
    start: jest.fn().mockResolvedValue(createStartMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const uiSettingsServiceMock = {
  createPrebootContract: createPrebootMock,
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
  createClient: createClientMock,
  create: createMock,
};
