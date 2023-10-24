/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import type { PluginsServiceSetup, PluginsServiceStart } from '@kbn/core-plugins-contracts-server';
import {
  PluginsService,
  type InternalPluginsServiceSetup,
  type InternalPluginsServiceStart,
} from '@kbn/core-plugins-server-internal';

type PluginsServiceMock = jest.Mocked<PublicMethodsOf<PluginsService>>;

const createInternalSetupContractMock = (): InternalPluginsServiceSetup => ({
  contracts: new Map(),
  initialized: true,
});
const createInternalStartContractMock = (): InternalPluginsServiceStart => ({
  contracts: new Map(),
});

const createServiceMock = (): PluginsServiceMock => ({
  discover: jest.fn(),
  getExposedPluginConfigsToUsage: jest.fn(),
  preboot: jest.fn(),
  setup: jest.fn().mockResolvedValue(createInternalSetupContractMock()),
  start: jest.fn().mockResolvedValue(createInternalStartContractMock()),
  stop: jest.fn(),
});

const createSetupContractMock = () => {
  const contract: jest.Mocked<PluginsServiceSetup> = {
    onSetup: jest.fn(),
    onStart: jest.fn(),
  };

  return contract;
};

const createStartContractMock = () => {
  const contract: jest.Mocked<PluginsServiceStart> = {
    onStart: jest.fn(),
  };
  return contract;
};

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
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createUiPlugins,
};
