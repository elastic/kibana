/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { IRouter, RequestHandlerContextBase } from '@kbn/core-http-server';
import type { UiSettingsRequestHandlerContext } from '../ui_settings';

/**
 * Request handler context used by core's coreApp routes.
 * @internal
 */
export interface InternalCoreAppRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{
    uiSettings: UiSettingsRequestHandlerContext;
  }>;
}

/**
 * Router bound to the {@link InternalCoreAppRequestHandlerContext}.
 * Used by core's coreApp routes.
 * @internal
 */
export type InternalCoreAppRouter = IRouter<InternalCoreAppRequestHandlerContext>;
