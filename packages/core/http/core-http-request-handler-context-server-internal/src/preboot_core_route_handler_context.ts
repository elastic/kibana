/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// eslint-disable-next-line max-classes-per-file
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
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
 * Implementation of {@link PrebootUiSettingsRequestHandlerContext}
 * @internal
 */
class PrebootCoreUiSettingsRouteHandlerContext implements PrebootUiSettingsRequestHandlerContext {
  constructor(public readonly client: IUiSettingsClient) {}
}

/**
 * Implementation of {@link PrebootCoreRequestHandlerContext}.
 * @internal
 */
export class PrebootCoreRouteHandlerContext implements PrebootCoreRequestHandlerContext {
  readonly uiSettings: PrebootUiSettingsRequestHandlerContext;

  constructor(private readonly corePreboot: PrebootCoreRouteHandlerContextParams) {
    this.uiSettings = new PrebootCoreUiSettingsRouteHandlerContext(
      this.corePreboot.uiSettings.createDefaultsClient()
    );
  }
}
