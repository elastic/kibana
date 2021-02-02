/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import { dashboardsServiceFactory } from './dashboards';
import { capabilitiesServiceFactory } from './capabilities';
import { PluginServiceProviders, PluginServiceProvider, PluginServiceRegistry } from '../create';
import { PresentationUtilServices } from '..';

export { dashboardsServiceFactory } from './dashboards';
export { capabilitiesServiceFactory } from './capabilities';

export const providers: PluginServiceProviders<PresentationUtilServices> = {
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
};

export const registry = new PluginServiceRegistry<PresentationUtilServices>(providers);
