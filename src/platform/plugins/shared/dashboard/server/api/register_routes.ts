/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { CoreSetup, Logger, RequestHandlerContext } from '@kbn/core/server';
import type { UsageCounter } from '@kbn/usage-collection-plugin/server';

import type { StartDeps } from '../plugin';
import type { DashboardPluginStart } from '../types';
import { registerTrackUserActivityRoute } from '../user_activity/register_routes';
import { registerCreateRoute } from './create';
import { registerDeleteRoute } from './delete';
import { registerReadRoute } from './read';
import { registerSanitizeRoute } from './sanitize';
import { registerSearchRoute } from './search';
import { registerUpdateRoute } from './update';
import { registerChangeHistoryRoute } from '../change_history/register_routes';

export function registerRoutes(
  core: CoreSetup<StartDeps, DashboardPluginStart>,
  usageCounter: UsageCounter | undefined,
  logger: Logger
) {
  const { versioned: versionedRouter } = core.http.createRouter<RequestHandlerContext>();

  //
  // REST API routes
  // Only allows panel.type value with registered embeddable schema
  // Validate panel.config at route level
  //
  registerCreateRoute(versionedRouter, usageCounter, false, logger);
  registerReadRoute(versionedRouter, usageCounter, false, logger);
  registerUpdateRoute(versionedRouter, usageCounter, false, logger);
  registerDeleteRoute(versionedRouter, usageCounter, logger);
  registerSearchRoute(versionedRouter, usageCounter, logger);
  registerSanitizeRoute(versionedRouter, logger);

  //
  // Dashboard application specific routes
  // Allow any panel.type value
  // Validate panel.config in handler
  // Don't track usage for these routes
  //
  // TODO remove these routes when all embeddable schemas are registered
  //
  registerCreateRoute(versionedRouter, undefined, true, logger);
  registerReadRoute(versionedRouter, undefined, true, logger);
  registerUpdateRoute(versionedRouter, undefined, true, logger);

  const unversionedRouter = core.http.createRouter<RequestHandlerContext>();
  registerTrackUserActivityRoute(unversionedRouter);
  registerChangeHistoryRoute(core, unversionedRouter);
}
