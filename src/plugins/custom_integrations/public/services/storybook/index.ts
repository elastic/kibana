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

import { CustomIntegrationsServices } from '..';
import { findServiceFactory } from '../stub/find';
import { platformServiceFactory } from '../stub/platform';

export { findServiceFactory } from '../stub/find';
export { platformServiceFactory } from '../stub/platform';

/**
 * A set of `PluginServiceProvider`s for use in Storybook.
 * @see /src/plugins/presentation_util/public/services/create/provider.tsx
 */
export const providers: PluginServiceProviders<CustomIntegrationsServices> = {
  find: new PluginServiceProvider(findServiceFactory),
  platform: new PluginServiceProvider(platformServiceFactory),
};

/**
 * A `PluginServiceRegistry` for use in Storybook.
 * @see /src/plugins/presentation_util/public/services/create/registry.tsx
 */
export const registry = new PluginServiceRegistry<CustomIntegrationsServices>(providers);
