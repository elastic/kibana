/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { RequestHandlerContextBase } from '@kbn/core-http-server';
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';

/**
 * @public
 */
export interface PrebootUiSettingsRequestHandlerContext {
  client: IUiSettingsClient;
}

/**
 * @public
 */
export interface PrebootCoreRequestHandlerContext {
  uiSettings: PrebootUiSettingsRequestHandlerContext;
}

/**
 * @public
 */
export interface PrebootRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<PrebootCoreRequestHandlerContext>;
}
