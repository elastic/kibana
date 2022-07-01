/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContextBase } from '..';
import type { IRouter } from '../http';
import type { UiSettingsRequestHandlerContext } from './ui_settings_route_handler_context';

/**
 * Request handler context used by core's uiSetting routes.
 * @internal
 */
export interface InternalUiSettingsRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<{
    uiSettings: UiSettingsRequestHandlerContext;
  }>;
}

/**
 * Router bound to the {@link InternalUiSettingsRequestHandlerContext}.
 * Used by core's uiSetting routes.
 * @internal
 */
export type InternalUiSettingsRouter = IRouter<InternalUiSettingsRequestHandlerContext>;
