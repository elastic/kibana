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

import { Subject } from 'rxjs';

import { capabilitiesServiceMock } from './capabilities/capabilities_service.mock';
import { ApplicationService } from './application_service';
import {
  ApplicationSetup,
  InternalApplicationStart,
  ApplicationStart,
  InternalApplicationSetup,
} from './types';

type ApplicationServiceContract = PublicMethodsOf<ApplicationService>;

const createSetupContractMock = (): jest.Mocked<ApplicationSetup> => ({
  register: jest.fn(),
  registerMountContext: jest.fn(),
});

const createInternalSetupContractMock = (): jest.Mocked<InternalApplicationSetup> => ({
  register: jest.fn(),
  registerLegacyApp: jest.fn(),
  registerMountContext: jest.fn(),
});

const createStartContractMock = (legacyMode = false): jest.Mocked<ApplicationStart> => ({
  capabilities: capabilitiesServiceMock.createStartContract().capabilities,
  navigateToApp: jest.fn(),
  getUrlForApp: jest.fn(),
  registerMountContext: jest.fn(),
});

const createInternalStartContractMock = (): jest.Mocked<InternalApplicationStart> => ({
  availableApps: new Map(),
  availableLegacyApps: new Map(),
  capabilities: capabilitiesServiceMock.createStartContract().capabilities,
  navigateToApp: jest.fn(),
  getUrlForApp: jest.fn(),
  registerMountContext: jest.fn(),
  currentAppId$: new Subject<string | undefined>(),
  getComponent: jest.fn(),
});

const createMock = (): jest.Mocked<ApplicationServiceContract> => ({
  setup: jest.fn().mockReturnValue(createInternalSetupContractMock()),
  start: jest.fn().mockReturnValue(createInternalStartContractMock()),
  stop: jest.fn(),
});

export const applicationServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,

  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
};
