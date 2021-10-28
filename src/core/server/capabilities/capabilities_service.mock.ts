/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { CapabilitiesService, CapabilitiesSetup, CapabilitiesStart } from './capabilities_service';
import { Capabilities } from './types';

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

const createCapabilitiesMock = (): Capabilities => {
  return {
    navLinks: {},
    management: {},
    catalogue: {},
  };
};

type CapabilitiesServiceContract = PublicMethodsOf<CapabilitiesService>;
const createMock = () => {
  const mocked: jest.Mocked<CapabilitiesServiceContract> = {
    preboot: jest.fn(),
    setup: jest.fn().mockReturnValue(createSetupContractMock()),
    start: jest.fn().mockReturnValue(createStartContractMock()),
  };
  return mocked;
};

export const capabilitiesServiceMock = {
  create: createMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createCapabilities: createCapabilitiesMock,
};
