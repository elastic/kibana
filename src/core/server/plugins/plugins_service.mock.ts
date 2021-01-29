/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginsService, PluginsServiceSetup } from './plugins_service';

type PluginsServiceMock = jest.Mocked<PublicMethodsOf<PluginsService>>;

const createSetupContractMock = (): PluginsServiceSetup => ({
  contracts: new Map(),
  initialized: true,
});
const createStartContractMock = () => ({ contracts: new Map() });

const createServiceMock = (): PluginsServiceMock => ({
  discover: jest.fn(),
  setup: jest.fn().mockResolvedValue(createSetupContractMock()),
  start: jest.fn().mockResolvedValue(createStartContractMock()),
  stop: jest.fn(),
});

function createUiPlugins() {
  return {
    browserConfigs: new Map(),
    internal: new Map(),
    public: new Map(),
  };
}

export const pluginServiceMock = {
  create: createServiceMock,
  createSetupContract: createSetupContractMock,
  createStartContract: createStartContractMock,
  createUiPlugins,
};
