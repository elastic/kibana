/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { HttpServiceSetup } from '@kbn/core/server';

import type { UserContentService, MetadataEventsService } from '../services';
import type { RouteDependencies } from './types';
import { registerRegisterEventRoute } from './register_event';
import { registerBulkEventsRoute } from './register_bulk_events';
import { registerFetchUserContentTypes } from './register_fetch_user_content_types';
import { registerUpdateViewsCountRoute } from './update_views_count';

interface RegisterRouteOptions {
  http: HttpServiceSetup;
  userContentService: UserContentService;
  metadataEventsService: MetadataEventsService;
}

export function registerRoutes({
  http,
  userContentService,
  metadataEventsService,
}: RegisterRouteOptions) {
  const router = http.createRouter();

  const routeDeps: RouteDependencies = {
    userContentService,
    metadataEventsService,
  };

  registerRegisterEventRoute(router, routeDeps);
  registerBulkEventsRoute(router, routeDeps);
  registerFetchUserContentTypes(router, routeDeps);
  registerUpdateViewsCountRoute(router, routeDeps);
}
