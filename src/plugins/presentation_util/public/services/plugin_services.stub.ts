/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServices, PluginServiceProviders, PluginServiceProvider } from './create';
import { PresentationUtilServices } from './types';
import { registry as stubRegistry } from './plugin_services.story';
import { PresentationUtilPluginStart, registerExpressionsLanguage } from '..';

import { capabilitiesServiceFactory } from './capabilities/capabilities.story';
import { dataViewsServiceFactory } from './data_views/data_views.story';
import { labsServiceFactory } from './labs/labs.story';
import { uiActionsServiceFactory } from './ui_actions/ui_actions.stub';
import { contentManagementServiceFactory } from './content_management/content_management.stub';

export const providers: PluginServiceProviders<PresentationUtilServices> = {
  contentManagement: new PluginServiceProvider(contentManagementServiceFactory),
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  uiActions: new PluginServiceProvider(uiActionsServiceFactory),
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
