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
} from '@kbn/presentation-util-plugin/public';
import { ControlsServices } from './types';
import { dataServiceFactory } from './data/data.story';
import { unifiedSearchServiceFactory } from './unified_search/unified_search.story';
import { overlaysServiceFactory } from './overlays/overlays.story';
import { dataViewsServiceFactory } from './data_views/data_views.story';
import { httpServiceFactory } from './http/http.stub';
import { settingsServiceFactory } from './settings/settings.story';
import { themeServiceFactory } from './theme/theme.story';

import { optionsListServiceFactory } from './options_list/options_list.story';
import { controlsServiceFactory } from './controls/controls.story';
import { embeddableServiceFactory } from './embeddable/embeddable.story';

export const providers: PluginServiceProviders<ControlsServices> = {
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  theme: new PluginServiceProvider(themeServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),

  controls: new PluginServiceProvider(controlsServiceFactory),
  optionsList: new PluginServiceProvider(optionsListServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<ControlsServices>(providers);
