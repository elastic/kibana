/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { CapabilitiesSetup, CapabilitiesStart } from '@kbn/core-capabilities-server';
import type { CapabilitiesService } from '@kbn/core-capabilities-server-internal';

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

export type CapabilitiesServiceContract = PublicMethodsOf<CapabilitiesService>;

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
