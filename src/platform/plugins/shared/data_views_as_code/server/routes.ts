/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { routes } from './rest_routes';
import type { DataViewsAsCodeServerPluginStartDependencies } from './types';

export const INITIAL_REST_VERSION = '2023-10-31';

interface RegisterRoutesArgs {
  http: HttpServiceSetup;
  usageCounter: UsageCounter | undefined;
  logger: Logger;
  getStartServices: StartServicesAccessor<DataViewsAsCodeServerPluginStartDependencies, void>;
}

export function registerRoutes({ http, ...args }: RegisterRoutesArgs) {
  const router = http.createRouter();

  routes.forEach((route) => route({ router, ...args }));
}
