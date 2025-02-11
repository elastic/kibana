/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { Action, FrequentCompatibilityChangeAction } from '.';
import { UiActionsPublicSetup, UiActionsPublicStart } from './plugin';
import { plugin as pluginInitializer } from '.';

export type Setup = jest.Mocked<UiActionsPublicSetup>;
export type Start = jest.Mocked<UiActionsPublicStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    addTriggerAction: jest.fn(),
    addTriggerActionAsync: jest.fn(),
    attachAction: jest.fn(),
    detachAction: jest.fn(),
    registerAction: jest.fn(),
    registerActionAsync: jest.fn(),
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
    addTriggerActionAsync: jest.fn(),
    clear: jest.fn(),
    detachAction: jest.fn(),
    executeTriggerActions: jest.fn(),
    fork: jest.fn(),
    getAction: jest.fn(),
    hasAction: jest.fn(),
    getTrigger: jest.fn(),
    hasTrigger: jest.fn(),
    getTriggerActions: jest.fn(async (id: string) => []),
    getTriggerCompatibleActions: jest.fn((triggerId: string, context: object) =>
      Promise.resolve([] as Array<Action<object>>)
    ),
    getFrequentlyChangingActionsForTrigger: jest.fn(
      async (triggerId: string, context: object) =>
        [] as Array<FrequentCompatibilityChangeAction<object>>
    ),
    registerAction: jest.fn(),
    registerActionAsync: jest.fn(),
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
