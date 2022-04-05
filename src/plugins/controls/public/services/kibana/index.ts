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
} from '../../../../presentation_util/public';
import { ControlsPluginStartDeps } from '../../types';
import { ControlsServices } from '..';

import { dataViewsServiceFactory } from './data_views';
import { controlsServiceFactory } from './controls';
import { overlaysServiceFactory } from './overlays';
import { dataServiceFactory } from './data';
import { httpServiceFactory } from './http';
import { optionsListServiceFactory } from './options_list';
import { settingsServiceFactory } from './settings';

export const providers: PluginServiceProviders<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
> = {
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),

  optionsList: new PluginServiceProvider(optionsListServiceFactory, ['data', 'http']),
  controls: new PluginServiceProvider(controlsServiceFactory),
};

export const registry = new PluginServiceRegistry<
  ControlsServices,
  KibanaPluginServiceParams<ControlsPluginStartDeps>
>(providers);
