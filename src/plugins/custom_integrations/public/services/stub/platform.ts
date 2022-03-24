/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { PluginServiceFactory } from '../create';

import type { CustomIntegrationsPlatformService } from '../platform';

/**
 * A type definition for a factory to produce the `CustomIntegrationsPlatformService` with stubbed output.
 * @see /src/plugins/presentation_util/public/services/create/factory.ts
 */
export type CustomIntegrationsPlatformServiceFactory =
  PluginServiceFactory<CustomIntegrationsPlatformService>;

/**
 * A factory to produce the `CustomIntegrationsPlatformService` with stubbed output.
 */
export const platformServiceFactory: CustomIntegrationsPlatformServiceFactory = () => ({
  getBasePath: () => '/basePath',
  getAbsolutePath: (path: string): string => `https://example.com/basePath${path}`,
});
