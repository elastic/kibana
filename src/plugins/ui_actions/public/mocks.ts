/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { UiActionsSetup, UiActionsStart } from '.';
import { plugin as pluginInitializer } from '.';

export type Setup = jest.Mocked<UiActionsSetup>;
export type Start = jest.Mocked<UiActionsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    addTriggerAction: jest.fn(),
    attachAction: jest.fn(),
    detachAction: jest.fn(),
    registerAction: jest.fn(),
    registerTrigger: jest.fn(),
    unregisterAction: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    attachAction: jest.fn(),
    unregisterAction: jest.fn(),
    addTriggerAction: jest.fn(),
    clear: jest.fn(),
    detachAction: jest.fn(),
    executeTriggerActions: jest.fn(),
    fork: jest.fn(),
    getAction: jest.fn(),
    hasAction: jest.fn(),
    getTrigger: jest.fn(),
    getTriggerActions: jest.fn((id: string) => []),
    getTriggerCompatibleActions: jest.fn(),
    registerAction: jest.fn(),
    registerTrigger: jest.fn(),
  };

  return startContract;
};

const createPlugin = (
  coreSetup: CoreSetup = coreMock.createSetup(),
  coreStart: CoreStart = coreMock.createStart()
) => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = plugin.setup(coreSetup);

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => plugin.start(anotherCoreStart),
  };
};

export const uiActionsPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
