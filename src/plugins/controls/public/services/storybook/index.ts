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
} from '../../../../presentation_util/public';
import { ControlsServices } from '..';
import { dataServiceFactory } from './data';
import { unifiedSearchServiceFactory } from './unified_search';
import { overlaysServiceFactory } from './overlays';
import { dataViewsServiceFactory } from './data_views';
import { httpServiceFactory } from '../stub/http';
import { settingsServiceFactory } from './settings';

import { optionsListServiceFactory } from './options_list';
import { controlsServiceFactory } from '../stub/controls';

export type { ControlsServices } from '..';

export const providers: PluginServiceProviders<ControlsServices> = {
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),

  controls: new PluginServiceProvider(controlsServiceFactory),
  optionsList: new PluginServiceProvider(optionsListServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<ControlsServices>(providers);
