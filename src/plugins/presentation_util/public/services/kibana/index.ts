/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */
import type { PresentationUtilServices } from '..';
import type { PresentationUtilPluginStartDeps } from '../../types';
import type { KibanaPluginServiceParams } from '../create/factory';
import type { PluginServiceProviders } from '../create/provider';
import { PluginServiceProvider } from '../create/provider';
import { PluginServiceRegistry } from '../create/registry';
import { capabilitiesServiceFactory } from './capabilities';
import { dashboardsServiceFactory } from './dashboards';
import { labsServiceFactory } from './labs';

export { capabilitiesServiceFactory } from './capabilities';
export { dashboardsServiceFactory } from './dashboards';
export { labsServiceFactory } from './labs';

export const providers: PluginServiceProviders<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
};

export const registry = new PluginServiceRegistry<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
>(providers);
