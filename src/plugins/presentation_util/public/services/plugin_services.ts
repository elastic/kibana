/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PresentationUtilPluginStartDeps } from '../types';
import {
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from './create';

import { capabilitiesServiceFactory } from './capabilities/capabilities_service';
import { contentManagementServiceFactory } from './content_management/content_management_service';
import { dataViewsServiceFactory } from './data_views/data_views_service';
import { labsServiceFactory } from './labs/labs_service';
import { PresentationUtilServices } from './types';
import { uiActionsServiceFactory } from './ui_actions/ui_actions_service';

export const providers: PluginServiceProviders<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  uiActions: new PluginServiceProvider(uiActionsServiceFactory),
  contentManagement: new PluginServiceProvider(contentManagementServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const registry = new PluginServiceRegistry<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
>(providers);
