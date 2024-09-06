/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from '@kbn/presentation-util-plugin/public';
import { controlsServiceFactory } from './controls/controls.story';
import { coreServiceFactory } from './core/core.story';
import { dataServiceFactory } from './data/data.story';
import { dataViewsServiceFactory } from './data_views/data_views.story';
import { embeddableServiceFactory } from './embeddable/embeddable.story';
import { httpServiceFactory } from './http/http.stub';
import { overlaysServiceFactory } from './overlays/overlays.story';
import { settingsServiceFactory } from './settings/settings.story';
import { storageServiceFactory } from './storage/storage_service.stub';
import { ControlsServices } from './types';
import { unifiedSearchServiceFactory } from './unified_search/unified_search.story';

export const providers: PluginServiceProviders<ControlsServices> = {
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  core: new PluginServiceProvider(coreServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  storage: new PluginServiceProvider(storageServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<ControlsServices>(providers);
