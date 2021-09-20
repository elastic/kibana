/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServices, PluginServiceProviders, PluginServiceProvider } from '../create';
import { dashboardsServiceFactory } from '../stub/dashboards';
import { labsServiceFactory } from './labs';
import { capabilitiesServiceFactory } from './capabilities';
import { PresentationUtilServices } from '..';
import { overlaysServiceFactory } from './overlays';

export { PluginServiceProviders, PluginServiceProvider, PluginServiceRegistry } from '../create';
export { PresentationUtilServices } from '..';

export interface StorybookParams {
  canAccessDashboards?: boolean;
  canCreateNewDashboards?: boolean;
  canSaveVisualizations?: boolean;
  canSetAdvancedSettings?: boolean;
}

export const providers: PluginServiceProviders<PresentationUtilServices, StorybookParams> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();
