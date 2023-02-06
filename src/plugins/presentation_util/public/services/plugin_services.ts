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
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceRegistry,
} from './create';
import { PresentationUtilPluginStartDeps } from '../types';

import { capabilitiesServiceFactory } from './capabilities/capabilities_service';
import { dataViewsServiceFactory } from './data_views/data_views_service';
import { dashboardsServiceFactory } from './dashboards/dashboards_service';
import { labsServiceFactory } from './labs/labs_service';
import { PresentationUtilServices } from './types';

export const providers: PluginServiceProviders<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
> = {
  capabilities: new PluginServiceProvider(capabilitiesServiceFactory),
  labs: new PluginServiceProvider(labsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  dashboards: new PluginServiceProvider(dashboardsServiceFactory),
};

export const pluginServices = new PluginServices<PresentationUtilServices>();

export const registry = new PluginServiceRegistry<
  PresentationUtilServices,
  KibanaPluginServiceParams<PresentationUtilPluginStartDeps>
>(providers);
