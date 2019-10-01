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

import { IUiSettingsService } from './ui_settings_service';

const createServiceMock = () => {
  const mocked: jest.Mocked<IUiSettingsService> = {
    getDefaults: jest.fn(),
    get: jest.fn(),
    getAll: jest.fn(),
    getRaw: jest.fn(),
    getUserProvided: jest.fn(),
    setMany: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    removeMany: jest.fn(),
    isOverridden: jest.fn(),
    assertUpdateAllowed: jest.fn(),
  };
  mocked.get.mockResolvedValue(false);
  return mocked;
};

export const uiSettingsServiceMock = {
  create: createServiceMock,
};
