/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { CoreStart } from 'kibana/public';
import { PresentationUtilPluginStart } from './types';
import { pluginServices } from './services';
import { registry } from './services/kibana';
import { registerExpressionsLanguage } from '.';

const createStartContract = (coreStart: CoreStart): PresentationUtilPluginStart => {
  pluginServices.setRegistry(registry.start({ coreStart, startPlugins: { dataViews: {} } as any }));

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

export * from './__stories__/fixtures/flights';
