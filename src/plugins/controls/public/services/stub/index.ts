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
} from '../../../../presentation_util/public';
import { ControlsServices } from '..';
import { overlaysServiceFactory } from './overlays';
import { controlsServiceFactory } from './controls';

import { dataServiceFactory } from '../storybook/data';
import { dataViewsServiceFactory } from '../storybook/data_views';

export const providers: PluginServiceProviders<ControlsServices> = {
  data: new PluginServiceProvider(dataServiceFactory),
  overlays: new PluginServiceProvider(overlaysServiceFactory),
  controls: new PluginServiceProvider(controlsServiceFactory),
  dataViews: new PluginServiceProvider(dataViewsServiceFactory),
};

export const registry = new PluginServiceRegistry<ControlsServices>(providers);
