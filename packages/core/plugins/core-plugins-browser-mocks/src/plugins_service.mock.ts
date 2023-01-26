/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import type { PluginsService, PluginsServiceSetup } from '@kbn/core-plugins-browser-internal';

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

const createPluginInitializerContextMock = (config: unknown = {}) => {
  const mock: PluginInitializerContext = {
    opaqueId: Symbol(),
    env: {
      mode: {
        dev: true,
        name: 'development',
        prod: false,
      },
      packageInfo: {
        version: 'version',
        branch: 'branch',
        buildNum: 100,
        buildSha: 'buildSha',
        dist: false,
      },
    },
    logger: loggerMock.create(),
    config: {
      get: <T>() => config as T,
    },
  };

  return mock;
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
  createPluginInitializerContext: createPluginInitializerContextMock,
};
