/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { capabilitiesServiceFactory } from './capabilities';
import { dashboardsServiceFactory } from './dashboards';
import { experimentsServiceFactory } from './experiments';
import {
  PluginServiceProviders,
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceRegistry,
} from '../create';
import { PresentationUtilPluginStartDeps } from '../../types';
import { PresentationUtilServices } from '..';

export { capabilitiesServiceFactory } from './capabilities';
export { dashboardsServiceFactory } from './dashboards';
export { experimentsServiceFactory } from './experiments';

export const providers: PluginServiceProviders<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  experiments: new PluginServiceProvider(experimentsServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
};

export const registry = new PluginServiceRegistry<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
>(providers);
