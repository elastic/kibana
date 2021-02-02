/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { PluginServices, PluginServiceProviders, PluginServiceProvider } from '../create';
import { dashboardsServiceFactory } from '../stub/dashboards';
import { capabilitiesServiceFactory } from './capabilities';
import { PresentationUtilServices } from '..';

export { PluginServiceProviders, PluginServiceProvider, PluginServiceRegistry } from '../create';
export { PresentationUtilServices } from '..';

export interface StorybookParams {
  canAccessDashboards?: boolean;
  canCreateNewDashboards?: boolean;
  canEditDashboards?: boolean;
}

export const providers: PluginServiceProviders<PresentationUtilServices, StorybookParams> = {
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();
