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
  KibanaPluginServiceParams,
} from '../../../../presentation_util/public';

import { CustomIntegrationsServices } from '..';
import { CustomIntegrationsStartDependencies } from '../../types';

import { findServiceFactory } from './find';

export { findServiceFactory } from './find';

export const pluginServiceProviders: PluginServiceProviders<
  CustomIntegrationsServices,
  KibanaPluginServiceParams<CustomIntegrationsStartDependencies>
> = {
  find: new PluginServiceProvider(findServiceFactory),
};

export const pluginServiceRegistry = new PluginServiceRegistry<
  CustomIntegrationsServices,
  KibanaPluginServiceParams<CustomIntegrationsStartDependencies>
>(pluginServiceProviders);
