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

import { PluginsService, PluginsServiceSetup } from './plugins_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<PluginsServiceSetup> = {
    contracts: new Map(),
  };
  // we have to suppress type errors until decide how to mock es6 class
  return setupContract as PluginsServiceSetup;
};

const createStartContractMock = () => {
  const startContract: jest.Mocked<PluginsServiceSetup> = {
    contracts: new Map(),
  };
  // we have to suppress type errors until decide how to mock es6 class
  return startContract as PluginsServiceSetup;
};

type PluginsServiceContract = PublicMethodsOf<PluginsService>;
const createMock = () => {
  const mocked: jest.Mocked<PluginsServiceContract> = {
    getOpaqueIds: jest.fn(),
    setup: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
  };

  mocked.setup.mockResolvedValue(createSetupContractMock());
  mocked.start.mockResolvedValue(createStartContractMock());
  return mocked;
};

export const pluginsServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
