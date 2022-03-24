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
} from '../create';

import { CustomIntegrationsServices } from '..';
import { CustomIntegrationsStartDependencies } from '../../types';

import { findServiceFactory } from './find';
import { platformServiceFactory } from './platform';

export { findServiceFactory } from './find';
export { platformServiceFactory } from './platform';

/**
 * A set of `PluginServiceProvider`s for use in Kibana.
 * @see /src/plugins/presentation_util/public/services/create/provider.tsx
 */
export const pluginServiceProviders: PluginServiceProviders<
  CustomIntegrationsServices,
  KibanaPluginServiceParams<CustomIntegrationsStartDependencies>
> = {
  find: new PluginServiceProvider(findServiceFactory),
  platform: new PluginServiceProvider(platformServiceFactory),
};

/**
 * A `PluginServiceRegistry` for use in Kibana.
 * @see /src/plugins/presentation_util/public/services/create/registry.tsx
 */
export const pluginServiceRegistry = new PluginServiceRegistry<
  CustomIntegrationsServices,
  KibanaPluginServiceParams<CustomIntegrationsStartDependencies>
>(pluginServiceProviders);
