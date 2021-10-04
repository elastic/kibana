/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../../../../presentation_util/public';

import { CustomIntegrationsFindService, filterCustomIntegrations } from '../find';

export type CustomIntegrationsFindServiceFactory =
  PluginServiceFactory<CustomIntegrationsFindService>;

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
