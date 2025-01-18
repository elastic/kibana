/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { UiSettingsRequestHandlerContext } from '@kbn/core-ui-settings-server';

/**
 * Request handler context used by core's coreApp routes.
 * @internal
 */
export interface InternalCoreAppsServiceRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{
    uiSettings: UiSettingsRequestHandlerContext;
  }>;
}

/**
 * Router bound to the {@link InternalCoreAppsServiceRequestHandlerContext}.
 * Used by core's coreApp routes.
 * @internal
 */
export type InternalCoreAppsServiceRouter = IRouter<InternalCoreAppsServiceRequestHandlerContext>;
