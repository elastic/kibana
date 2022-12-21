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
} from '@kbn/presentation-util-plugin/public';

import { ControlsServices } from './types';
import { ControlsPluginStart } from '../types';

import { httpServiceFactory } from './http/http.stub';
import { overlaysServiceFactory } from './overlays/overlays.stub';
import { controlsServiceFactory } from './controls/controls.story';
import { dataServiceFactory } from './data/data.story';
import { dataViewsServiceFactory } from './data_views/data_views.story';
import { optionsListServiceFactory } from './options_list/options_list.story';
import { settingsServiceFactory } from './settings/settings.story';
import { unifiedSearchServiceFactory } from './unified_search/unified_search.story';
import { themeServiceFactory } from './theme/theme.story';
import { registry as stubRegistry } from './plugin_services.story';
import { embeddableServiceFactory } from './embeddable/embeddable.story';

export const providers: PluginServiceProviders<ControlsServices> = {
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  optionsList: new PluginServiceProvider(optionsListServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  theme: new PluginServiceProvider(themeServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const getStubPluginServices = (): ControlsPluginStart => {
  pluginServices.setRegistry(stubRegistry.start({}));
  return {
    getControlFactory: pluginServices.getServices().controls.getControlFactory,
    getControlTypes: pluginServices.getServices().controls.getControlTypes,
  };
};
