/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  PrebootUiSettingsRequestHandlerContext,
  PrebootCoreRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';
import type { InternalUiSettingsServicePreboot } from '@kbn/core-ui-settings-server-internal';
/**
 * @internal
 */
export interface PrebootCoreRouteHandlerContextParams {
  uiSettings: InternalUiSettingsServicePreboot;
}
/**
 * Implementation of {@link PrebootCoreRequestHandlerContext}.
 * @internal
 */
export declare class PrebootCoreRouteHandlerContext implements PrebootCoreRequestHandlerContext {
  private readonly corePreboot;
  readonly uiSettings: PrebootUiSettingsRequestHandlerContext;
  constructor(corePreboot: PrebootCoreRouteHandlerContextParams);
}
