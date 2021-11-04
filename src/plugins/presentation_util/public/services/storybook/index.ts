/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginServices,
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServiceRegistry,
} from '../create';
import { dashboardsServiceFactory } from '../stub/dashboards';
import { labsServiceFactory } from './labs';
import { capabilitiesServiceFactory } from './capabilities';
import { PresentationUtilServices } from '..';
import { overlaysServiceFactory } from './overlays';
import { controlsServiceFactory } from './controls';
import { dataViewsServiceFactory } from './data_views';
import { dataServiceFactory } from './data';

export type { PluginServiceProviders } from '../create';
export { PluginServiceProvider, PluginServiceRegistry } from '../create';
export type { PresentationUtilServices } from '..';

export interface StorybookParams {
  canAccessDashboards?: boolean;
  canCreateNewDashboards?: boolean;
  canSaveVisualizations?: boolean;
  canSetAdvancedSettings?: boolean;
}

export const providers: PluginServiceProviders<PresentationUtilServices, StorybookParams> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const registry = new PluginServiceRegistry<PresentationUtilServices>(providers);
