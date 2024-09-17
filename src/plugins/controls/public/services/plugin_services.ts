/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  KibanaPluginServiceParams,
  PluginServiceProvider,
  PluginServiceProviders,
  PluginServiceRegistry,
  PluginServices,
} from '@kbn/presentation-util-plugin/public';
import { ControlsPluginStartDeps } from '../types';
import { ControlsServices } from './types';

import { controlsServiceFactory } from './controls/controls_service';
import { coreServiceFactory } from './core/core_service';
import { dataServiceFactory } from './data/data_service';
import { dataViewsServiceFactory } from './data_views/data_views_service';
import { embeddableServiceFactory } from './embeddable/embeddable_service';
import { httpServiceFactory } from './http/http_service';
import { optionsListServiceFactory } from './options_list/options_list_service';
import { overlaysServiceFactory } from './overlays/overlays_service';
import { settingsServiceFactory } from './settings/settings_service';
import { controlsStorageServiceFactory } from './storage/storage_service';
import { unifiedSearchServiceFactory } from './unified_search/unified_search_service';

export const providers: PluginServiceProviders<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
> = {
  controls: new PluginServiceProvider(controlsServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  optionsList: new PluginServiceProvider(optionsListServiceFactory, ['data', 'http']),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  storage: new PluginServiceProvider(controlsStorageServiceFactory),
  core: new PluginServiceProvider(coreServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
>(providers);
