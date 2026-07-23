/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { registerCreateRoute } from './register_create_route';
import { registerDeleteRoute } from './register_delete_route';
import { registerGetRoute } from './register_get_route';
import { registerUpsertRoute } from './register_upsert_route';
import { registerSearchRoute } from './register_search_route';

export const registerRoutes = (
  http: HttpServiceSetup,
  logger: Logger,
  usageCounter: UsageCounter | undefined
) => {
  const { versioned } = http.createRouter<RequestHandlerContext>();

  registerCreateRoute(versioned, logger, usageCounter);
  registerUpsertRoute(versioned, logger, usageCounter);
  registerGetRoute(versioned, logger, usageCounter);
  registerSearchRoute(versioned, logger, usageCounter);
  registerDeleteRoute(versioned, logger, usageCounter);
};
