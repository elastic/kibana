/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServices } from './create';

import { CustomIntegrationsFindService } from './find';
import { CustomIntegrationsPlatformService } from './platform';

/**
 * Services used by the custom integrations plugin.
 */
export interface CustomIntegrationsServices {
  find: CustomIntegrationsFindService;
  platform: CustomIntegrationsPlatformService;
}

/**
 * The `PluginServices` object for the custom integrations plugin.
 * @see /src/plugins/presentation_util/public/services/create/index.ts
 */
export const pluginServices = new PluginServices<CustomIntegrationsServices>();

/**
 * A React hook that provides connections to the `CustomIntegrationsFindService`.
 */
export const useFindService = () => (() => pluginServices.getHooks().find.useService())();

/**
 * A React hook that provides connections to the `CustomIntegrationsPlatformService`.
 */
export const usePlatformService = () => (() => pluginServices.getHooks().platform.useService())();
