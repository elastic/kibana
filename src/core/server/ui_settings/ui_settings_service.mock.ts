/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import {
  IUiSettingsClient,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
} from './types';
import { UiSettingsService } from './ui_settings_service';

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
  return mocked;
};

const createSetupMock = () => {
  const mocked: jest.Mocked<InternalUiSettingsServiceSetup> = {
    register: jest.fn(),
    asScopedToClient: jest.fn(),
  };

  mocked.asScopedToClient.mockReturnValue(createClientMock());

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
