/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginServiceProviders,
  PluginServiceProvider,
  PluginServices,
  PluginServiceRegistry,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';

import { httpServiceFactory } from './http/http.stub';
import { dataServiceFactory } from './data/data.stub';
import { visualizationsServiceFactory } from './visualizations/visualizations.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
