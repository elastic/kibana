/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { capabilitiesServiceFactory } from './capabilities';
import { dashboardsServiceFactory } from './dashboards';
import { labsServiceFactory } from './labs';
import { PluginServiceProviders, PluginServiceProvider, PluginServiceRegistry } from '../create';
import { PresentationUtilServices } from '..';
import { overlaysServiceFactory } from './overlays';
import { controlsServiceFactory } from './controls';
export { dashboardsServiceFactory } from './dashboards';
export { capabilitiesServiceFactory } from './capabilities';

import { dataServiceFactory } from '../storybook/data';
import { dataViewsServiceFactory } from '../storybook/data_views';

export const providers: PluginServiceProviders<PresentationUtilServices> = {
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
};

export const registry = new PluginServiceRegistry<PresentationUtilServices>(providers);
