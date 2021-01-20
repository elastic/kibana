/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
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
