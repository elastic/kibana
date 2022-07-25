/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { BfetchPublicSetup, BfetchPublicStart } from '.';
import { plugin as pluginInitializer } from '.';

export type Setup = jest.Mocked<BfetchPublicSetup>;
export type Start = jest.Mocked<BfetchPublicStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    fetchStreaming: jest.fn(),
    batchedFunction: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    fetchStreaming: jest.fn(),
    batchedFunction: jest.fn(),
  };

  return startContract;
};

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup, {});

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () => await plugin.start(coreStart, {}),
  };
};

export const bfetchPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
