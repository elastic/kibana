/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpServiceSetup } from '@kbn/core/server';
export const INITIAL_REST_VERSION = '2023-10-31';

interface RegisterRoutesArgs {
  http: HttpServiceSetup;
}

export function registerRoutes(_: RegisterRoutesArgs) {
  // The routes are going to be registered here at plugin setup
  // 1. GET /api/data_views/{id}
  // 2. POST /api/data_views
  // 3. PUT /api/data_views/{id}
  // 4. DELETE /api/data_views/{id}
}
