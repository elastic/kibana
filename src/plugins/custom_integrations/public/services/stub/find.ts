/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '@kbn/presentation-util-plugin/public';

import { CustomIntegrationsFindService, filterCustomIntegrations } from '../find';

/**
 * A type definition for a factory to produce the `CustomIntegrationsFindService` with stubbed output.
 * @see /src/plugins/presentation_util/public/services/create/factory.ts
 */
export type CustomIntegrationsFindServiceFactory =
  PluginServiceFactory<CustomIntegrationsFindService>;

/**
 * A factory to produce the `CustomIntegrationsFindService` with stubbed output.
 */
export const findServiceFactory: CustomIntegrationsFindServiceFactory = () => ({
  findAppendedIntegrations: async (params) => {
    const { integrations } = await import('./fixtures/integrations');
    return filterCustomIntegrations(integrations, params);
  },
  findReplacementIntegrations: async (params) => {
    const { integrations } = await import('./fixtures/integrations');
    return filterCustomIntegrations(integrations, params);
  },
});
