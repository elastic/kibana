/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { PublicMethodsOf } from '@kbn/utility-types';
import { loggerMock } from '@kbn/logging-mocks';
import type { PluginInitializerContext } from '@kbn/core-plugins-browser';
import type {
  PluginsService,
  InternalPluginsServiceSetup,
  InternalPluginsServiceStart,
} from '@kbn/core-plugins-browser-internal';
import type { BuildFlavor } from '@kbn/config/src/types';

const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalPluginsServiceSetup> = {
    contracts: new Map(),
  };
  // we have to suppress type errors until decide how to mock es6 class
  return setupContract as InternalPluginsServiceSetup;
};

const createInternalStartContractMock = () => {
  const startContract: jest.Mocked<InternalPluginsServiceStart> = {
    contracts: new Map(),
  };
  // we have to suppress type errors until decide how to mock es6 class
  return startContract as InternalPluginsServiceSetup;
};

const createPluginInitializerContextMock = (
  config: unknown = {},
  { buildFlavor = 'serverless' }: { buildFlavor?: BuildFlavor } = {}
) => {
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
        buildShaShort: 'buildShaShort',
        dist: false,
        buildDate: new Date('2023-05-15T23:12:09.000Z'),
        buildFlavor,
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

  mocked.setup.mockResolvedValue(createInternalSetupContractMock());
  mocked.start.mockResolvedValue(createInternalStartContractMock());
  return mocked;
};

export const pluginsServiceMock = {
  create: createMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createPluginInitializerContext: createPluginInitializerContextMock,
};
