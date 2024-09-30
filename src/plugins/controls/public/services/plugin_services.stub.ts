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

import { ControlsPluginStart } from '../types';
import { ControlsServices } from './types';

import { controlsServiceFactory } from './controls/controls.stub';
import { coreServiceFactory } from './core/core.stub';
import { dataServiceFactory } from './data/data.stub';
import { dataViewsServiceFactory } from './data_views/data_views.stub';
import { embeddableServiceFactory } from './embeddable/embeddable.stub';
import { httpServiceFactory } from './http/http.stub';
import { overlaysServiceFactory } from './overlays/overlays.stub';
import { settingsServiceFactory } from './settings/settings.stub';
import { unifiedSearchServiceFactory } from './unified_search/unified_search.stub';
import { storageServiceFactory } from './storage/storage_service.stub';

export const providers: PluginServiceProviders<ControlsServices> = {
  embeddable: new PluginServiceProvider(embeddableServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  http: new PluginServiceProvider(httpServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),
  core: new PluginServiceProvider(coreServiceFactory),
  storage: new PluginServiceProvider(storageServiceFactory),
  unifiedSearch: new PluginServiceProvider(unifiedSearchServiceFactory),
};

export const pluginServices = new PluginServices<ControlsServices>();

export const registry = new PluginServiceRegistry<ControlsServices>(providers);

export const getStubPluginServices = (): ControlsPluginStart => {
  pluginServices.setRegistry(registry.start({}));
  return {
    getControlFactory: pluginServices.getServices().controls.getControlFactory,
    getAllControlTypes: pluginServices.getServices().controls.getAllControlTypes,
  };
};
