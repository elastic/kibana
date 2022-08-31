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
import { ControlsPluginStartDeps } from '../types';
import { ControlsServices } from './types';

import { dataViewsServiceFactory } from './data_views/data_views_service';
import { controlsServiceFactory } from './controls/controls_service';
import { overlaysServiceFactory } from './overlays/overlays_service';
import { dataServiceFactory } from './data/data_service';
import { httpServiceFactory } from './http/http_service';
import { optionsListServiceFactory } from './options_list/options_list_service';
import { settingsServiceFactory } from './settings/settings_service';
import { unifiedSearchServiceFactory } from './unified_search/unified_search_service';
import { themeServiceFactory } from './theme/theme_service';

export const providers: PluginServiceProviders<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
> = {
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  theme: new PluginServiceProvider(themeServiceFactory),

  optionsList: new PluginServiceProvider(optionsListServiceFactory, ['data', 'http']),
  controls: new PluginServiceProvider(controlsServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
>(providers);
