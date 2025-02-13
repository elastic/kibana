/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export { CoreAppsService } from './core_app';
export { config, type CoreAppConfigType } from './core_app_config';
export type {
  InternalCoreAppsServiceRequestHandlerContext,
  InternalCoreAppsServiceRouter,
} from './internal_types';
// only used by integration tests
export { registerRouteForBundle, FileHashCache } from './bundle_routes';
