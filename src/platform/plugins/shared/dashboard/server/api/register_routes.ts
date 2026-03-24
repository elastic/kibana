/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup } from '@kbn/core/server';

import { registerCreateRoute } from './create';
import { registerUpdateRoute } from './update';
import { registerDeleteRoute } from './delete';
import { registerSearchRoute } from './search';
import { registerReadRoute } from './read';

export function registerRoutes(http: HttpServiceSetup) {
  const { versioned: versionedRouter } = http.createRouter();

  //
  // REST API routes
  // Only allows panel.type value with registered embeddable schema
  // Validate panel.config at route level
  //
  registerCreateRoute(versionedRouter, false);
  registerReadRoute(versionedRouter, false);
  registerUpdateRoute(versionedRouter, false);
  registerDeleteRoute(versionedRouter);
  registerSearchRoute(versionedRouter);

  //
  // Dashboard application specific routes
  // Allow any panel.type value
  // Validate panel.config in handler
  //
  // TODO remove these routes when all embeddable schemas are registered
  //
  registerCreateRoute(versionedRouter, true);
  registerReadRoute(versionedRouter, true);
  registerUpdateRoute(versionedRouter, true);
}
