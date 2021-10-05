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

import { findServiceFactory } from '../stub/find';
import { CustomIntegrationsServices } from '..';

export { findServiceFactory } from '../stub/find';

/**
 * A set of `PluginServiceProvider`s for use in Storybook.
 * @see /src/plugins/presentation_util/public/services/create/provider.tsx
 */
export const providers: PluginServiceProviders<CustomIntegrationsServices> = {
  find: new PluginServiceProvider(findServiceFactory),
};

/**
 * A `PluginServiceRegistry` for use in Storybook.
 * @see /src/plugins/presentation_util/public/services/create/registry.tsx
 */
export const registry = new PluginServiceRegistry<CustomIntegrationsServices>(providers);
