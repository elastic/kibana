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
import { ControlsServices } from '..';
import { httpServiceFactory } from './http';
import { overlaysServiceFactory } from './overlays';
import { controlsServiceFactory } from './controls';

import { dataServiceFactory } from '../storybook/data';
import { dataViewsServiceFactory } from '../storybook/data_views';
import { optionsListServiceFactory } from '../storybook/options_list';
import { settingsServiceFactory } from '../storybook/settings';

export const providers: PluginServiceProviders<ControlsServices> = {
  http: new PluginServiceProvider(httpServiceFactory),
  data: new PluginServiceProvider(dataServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
  settings: new PluginServiceProvider(settingsServiceFactory),

  controls: new PluginServiceProvider(controlsServiceFactory),
  optionsList: new PluginServiceProvider(optionsListServiceFactory),
};

export const registry = new PluginServiceRegistry<ControlsServices>(providers);
