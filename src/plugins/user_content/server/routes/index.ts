/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup } from '@kbn/core/server';

import type { UserContentEventsStream } from '../types';
import type { MetadataEventsService } from '../services';
import type { RouteDependencies } from './types';
import { registerRegisterEventRoute } from './register_event';
import { registerBulkEventsRoute } from './register_bulk_events';
import { registerUpdateViewsCountRoute } from './update_views_count';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  userContentEventStreamPromise: Promise<UserContentEventsStream>;
  metadataEventsService: MetadataEventsService;
}

export function registerRoutes({
  http,
  userContentEventStreamPromise,
  metadataEventsService,
}: RegisterRouteOptions) {
  const router = http.createRouter();

  const routeDeps: RouteDependencies = { userContentEventStreamPromise, metadataEventsService };

  registerRegisterEventRoute(router, routeDeps);
  registerBulkEventsRoute(router, routeDeps);
  registerUpdateViewsCountRoute(router, routeDeps);
}
