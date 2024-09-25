/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { PresentationUtilPluginStart, registerExpressionsLanguage } from '..';
import { PluginServiceProvider, PluginServiceProviders, PluginServices } from './create';
import { registry as stubRegistry } from './plugin_services.story';
import { PresentationUtilServices } from './types';

import { capabilitiesServiceFactory } from './capabilities/capabilities.story';
import { labsServiceFactory } from './labs/labs.story';

export const providers: PluginServiceProviders<PresentationUtilServices> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const getStubPluginServices = (): PresentationUtilPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));
  return {
    ContextProvider: pluginServices.getContextProvider(),
    labsService: pluginServices.getServices().labs,
    registerExpressionsLanguage,
  };
};
