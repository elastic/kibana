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
import * as Rx from 'rxjs';
import { UiSettingsService } from './';
import { IUiSettingsClient } from './types';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<IUiSettingsClient> = {
    getAll: jest.fn(),
    get: jest.fn(),
    get$: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    isDeclared: jest.fn(),
    isDefault: jest.fn(),
    isCustom: jest.fn(),
    isOverridden: jest.fn(),
    overrideLocalDefault: jest.fn(),
    getUpdate$: jest.fn(),
    getSaved$: jest.fn(),
    getUpdateErrors$: jest.fn(),
  };
  setupContract.get$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getUpdate$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getSaved$.mockReturnValue(new Rx.Subject<any>());
  setupContract.getUpdateErrors$.mockReturnValue(new Rx.Subject<any>());

  return setupContract;
};

type UiSettingsServiceContract = PublicMethodsOf<UiSettingsService>;
const createMock = () => {
  const mocked: jest.Mocked<UiSettingsServiceContract> = {
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockReturnValue(createSetupContractMock());
  return mocked;
};

export const uiSettingsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createSetupContractMock,
};
