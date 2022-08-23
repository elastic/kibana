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
  PluginServiceRegistry,
} from '@kbn/presentation-util-plugin/public';

import { DashboardServices } from './types';

import { dataServiceFactory } from './data/data.stub';
import { dataViewEditorServiceFactory } from './data_view_editor/data_view_editor.stub';
import { spacesServiceFactory } from './spaces/spaces.stub';
import { httpServiceFactory } from './http/http.stub';
import { visualizationsServiceFactory } from './visualizations/visualizations.stub';
import { settingsServiceFactory } from './settings/settings_service.stub';

export const providers: PluginServiceProviders<DashboardServices> = {
  data: new PluginServiceProvider(dataServiceFactory),
  dataViewEditor: new PluginServiceProvider(dataViewEditorServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  spaces: new PluginServiceProvider(spacesServiceFactory),
  visualizations: new PluginServiceProvider(visualizationsServiceFactory),
};

export const registry = new PluginServiceRegistry<DashboardServices>(providers);
