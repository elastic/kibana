/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginServices,
  PluginServiceProviders,
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceRegistry,
} from './create';
import { PresentationUtilPluginStartDeps } from '../types';

import { capabilitiesServiceFactory } from './capabilities/capabilities_service';
import { dataViewsServiceFactory } from './data_views/data_views_service';
import { contentManagementServiceFactory } from './content_management/content_management_service';
import { uiActionsServiceFactory } from './ui_actions/ui_actions_service';
import { labsServiceFactory } from './labs/labs_service';
import { PresentationUtilServices } from './types';

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
