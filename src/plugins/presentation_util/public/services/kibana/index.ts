/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { capabilitiesServiceFactory } from './capabilities';
import { dashboardsServiceFactory } from './dashboards';
import { overlaysServiceFactory } from './overlays';
import { labsServiceFactory } from './labs';
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
export { overlaysServiceFactory } from './overlays';
export { labsServiceFactory } from './labs';

export const providers: PluginServiceProviders<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
};

export const registry = new PluginServiceRegistry<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
>(providers);
