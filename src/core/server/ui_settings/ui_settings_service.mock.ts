/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import {
  IUiSettingsClient,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './types';
import type { UiSettingsService } from './ui_settings_service';

const createClientMock = () => {
  const mocked: jest.Mocked<IUiSettingsClient> = {
    getRegistered: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    getUserProvided: jest.fn(),
    setMany: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    removeMany: jest.fn(),
    isOverridden: jest.fn(),
  };
  mocked.get.mockResolvedValue(false);
  mocked.getAll.mockResolvedValue({});
  mocked.getRegistered.mockReturnValue({});
  mocked.getUserProvided.mockResolvedValue({});
  return mocked;
};

const createSetupMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServiceSetup> = {
    register: jest.fn(),
  };

  return mocked;
};

const createStartMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServiceStart> = {
    asScopedToClient: jest.fn(),
  };

  mocked.asScopedToClient.mockReturnValue(createClientMock());

  return mocked;
};

type UiSettingsServiceContract = PublicMethodsOf<UiSettingsService>;
const createMock = () => {
  const mocked: jest.Mocked<UiSettingsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };
  mocked.setup.mockResolvedValue(createSetupMock());
  mocked.start.mockResolvedValue(createStartMock());
  return mocked;
};

export const uiSettingsServiceMock = {
  createSetupContract: createSetupMock,
  createStartContract: createStartMock,
  createClient: createClientMock,
  create: createMock,
};
