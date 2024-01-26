/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from '@kbn/core/public';
import { PresentationUtilPluginStart } from './types';
import { pluginServices } from './services';
import { registry as stubRegistry } from './services/plugin_services.story';
import { ReduxToolsPackage, registerExpressionsLanguage } from '.';
import { createReduxEmbeddableTools } from './redux_tools/redux_embeddables/create_redux_embeddable_tools';
import { createReduxTools } from './redux_tools/create_redux_tools';

const createStartContract = (coreStart: CoreStart): PresentationUtilPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));

  const startContract: PresentationUtilPluginStart = {
    ContextProvider: pluginServices.getContextProvider(),
    labsService: pluginServices.getServices().labs,
    registerExpressionsLanguage,
  };
  return startContract;
};

export const presentationUtilPluginMock = {
  createStartContract,
};

/**
 * A non async-imported version of the real redux embeddable tools package for mocking purposes.
 */
export const mockedReduxEmbeddablePackage: ReduxToolsPackage = {
  createReduxEmbeddableTools,
  createReduxTools,
};

export * from './__stories__/fixtures/flights';
