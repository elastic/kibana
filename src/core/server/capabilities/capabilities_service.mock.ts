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

import { CapabilitiesService, CapabilitiesSetup, CapabilitiesStart } from './capabilities_service';

const createSetupContractMock = () => {
  const setupContract: jest.Mocked<CapabilitiesSetup> = {
    registerProvider: jest.fn(),
    registerSwitcher: jest.fn(),
  };
  return setupContract;
};

const createStartContractMock = () => {
  const setupContract: jest.Mocked<CapabilitiesStart> = {
    resolveCapabilities: jest.fn().mockReturnValue(Promise.resolve({})),
  };
  return setupContract;
};

type CapabilitiesServiceContract = PublicMethodsOf<CapabilitiesService>;
const createMock = () => {
  const mocked: jest.Mocked<CapabilitiesServiceContract> = {
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
  };
  return mocked;
};

export const capabilitiesServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
};
