/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { licensingMock } from '@kbn/licensing-plugin/public/mocks';
import type { AdvancedUiActionsSetup, AdvancedUiActionsStart } from '.';
import { plugin as pluginInitializer } from '.';
import type { StartDependencies } from './plugin';

export type Setup = jest.Mocked<AdvancedUiActionsSetup>;
export type Start = jest.Mocked<AdvancedUiActionsStart>;

const createSetupContract = (): Setup => {
  const setupContract: Setup = {
    ...uiActionsPluginMock.createSetupContract(),
    registerDrilldown: jest.fn(),
  };
  return setupContract;
};

const createStartContract = (): Start => {
  const startContract: Start = {
    ...uiActionsPluginMock.createStartContract(),
    getActionFactories: jest.fn(),
    getActionFactory: jest.fn(),
    hasActionFactory: jest.fn(),
    DrilldownManager: jest.fn(),
  };

  return startContract;
};

const createPlugin = (
  coreSetup: CoreSetup<StartDependencies> = coreMock.createSetup(),
  coreStart: CoreStart = coreMock.createStart()
) => {
  const pluginInitializerContext = coreMock.createPluginInitializerContext();
  const uiActions = uiActionsPluginMock.createPlugin();
  const plugin = pluginInitializer(pluginInitializerContext);
  const setup = plugin.setup(coreSetup, {
    uiActions: uiActions.setup,
    licensing: licensingMock.createSetup(),
  });

  return {
    pluginInitializerContext,
    coreSetup,
    coreStart,
    plugin,
    setup,
    doStart: (anotherCoreStart: CoreStart = coreStart) => {
      const uiActionsStart = uiActions.doStart();
      return plugin.start(anotherCoreStart, {
        uiActions: uiActionsStart,
        licensing: licensingMock.createStart(),
      });
    },
  };
};

export const uiActionsEnhancedPluginMock = {
  createSetupContract,
  createStartContract,
  createPlugin,
};
