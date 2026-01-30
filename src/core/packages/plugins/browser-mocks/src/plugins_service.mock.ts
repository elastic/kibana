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
import { lazyObject } from '@kbn/lazy-object';

const createInternalSetupContractMock = () => {
  const setupContract: jest.Mocked<InternalPluginsServiceSetup> = lazyObject({
    contracts: new Map(),
  });
  // we have to suppress type errors until decide how to mock es6 class
  return setupContract as InternalPluginsServiceSetup;
};

const createInternalStartContractMock = () => {
  const startContract: jest.Mocked<InternalPluginsServiceStart> = lazyObject({
    contracts: new Map(),
  });
  // we have to suppress type errors until decide how to mock es6 class
  return startContract as InternalPluginsServiceSetup;
};

const createPluginInitializerContextMock = (
  config: unknown = {},
  { buildFlavor = 'serverless' }: { buildFlavor?: BuildFlavor } = {}
) => {
  const mock: PluginInitializerContext = lazyObject({
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
      airgapped: false,
    },
    logger: loggerMock.create(),
    config: {
      get: <T>() => config as T,
    },
  });

  return mock;
};

type PluginsServiceContract = PublicMethodsOf<PluginsService>;
const createMock = () => {
  const mocked: jest.Mocked<PluginsServiceContract> = lazyObject({
    getOpaqueIds: jest.fn(),
    setup: jest.fn().mockResolvedValue(createInternalSetupContractMock()),
    start: jest.fn().mockResolvedValue(createInternalStartContractMock()),
    stop: jest.fn(),
  });

  return mocked;
};

export const pluginsServiceMock = {
  create: createMock,
  createInternalSetupContract: createInternalSetupContractMock,
  createInternalStartContract: createInternalStartContractMock,
  createPluginInitializerContext: createPluginInitializerContextMock,
};
