/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { Setup as PluginSetup, Start as PluginStart } from '.';
import { InspectorViewRegistry } from './view_registry';
import { plugin as pluginInitializer } from '.';
import { coreMock } from '../../../core/public/mocks';

export type Setup = jest.Mocked<PluginSetup>;
export type Start = jest.Mocked<PluginStart>;

const createSetupContract = (): Setup => {
  const views = new InspectorViewRegistry();

  const setupContract: Setup = {
    registerView: jest.fn(views.register.bind(views)),

    __LEGACY: {
      views,
    },
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    isAvailable: jest.fn(),
    open: jest.fn(),
  };

  const openResult = {
    onClose: Promise.resolve(undefined),
    close: jest.fn(() => Promise.resolve(undefined)),
  } as ReturnType<Start['open']>;
  startContract.open.mockImplementation(() => openResult);

  return startContract;
};

const createPlugin = async () => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const coreSetup = coreMock.createSetup();
  const coreStart = coreMock.createStart();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = await plugin.setup(coreSetup);

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: async () => await plugin.start(coreStart),
  };
};

export const inspectorPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
