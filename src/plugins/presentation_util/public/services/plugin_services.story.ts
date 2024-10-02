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
  PluginServiceProvider,
  PluginServiceRegistry,
} from './create';
import { PresentationUtilServices } from './types';

import { capabilitiesServiceFactory } from './capabilities/capabilities.story';
import { dataViewsServiceFactory } from './data_views/data_views.story';
import { contentManagementServiceFactory } from './content_management/content_management.stub';
import { labsServiceFactory } from './labs/labs.story';
import { uiActionsServiceFactory } from './ui_actions/ui_actions.stub';

export const providers: PluginServiceProviders<PresentationUtilServices> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  contentManagement: new PluginServiceProvider(contentManagementServiceFactory),
  uiActions: new PluginServiceProvider(uiActionsServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const registry = new PluginServiceRegistry<PresentationUtilServices>(providers);

export interface StorybookParams {
  canAccessDashboards?: boolean;
  canCreateNewDashboards?: boolean;
  canSaveVisualizations?: boolean;
  canSetAdvancedSettings?: boolean;
}
