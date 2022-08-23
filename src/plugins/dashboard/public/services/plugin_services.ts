/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  PluginServiceProviders,
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceRegistry,
  PluginServices,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';
import { DashboardStartDependencies } from '../plugin';

import { dataServiceFactory } from './data/data_service';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor_service';
import { httpServiceFactory } from './http/http_service';
import { settingsServiceFactory } from './settings/settings_service';
import { spacesServiceFactory } from './spaces/spaces_service';
import { visualizationsServiceFactory } from './visualizations/visualizations_service';

const providers: PluginServiceProviders<
  DashboardServices,
  KibanaPluginServiceParams<DashboardStartDependencies>
> = {
  data: new PluginServiceProvider(dataServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  spaces: new PluginServiceProvider(spacesServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),
};

export const pluginServices = new PluginServices<DashboardServices>();

export const registry = new PluginServiceRegistry<
  DashboardServices,
  KibanaPluginServiceParams<DashboardStartDependencies>
>(providers);
