/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import type { IUiSettingsClient } from '@kbn/core-ui-settings-server';
import type { InternalCorePreboot } from './internal_types';

/**
 * @public
 */
export interface PrebootUiSettingsRequestHandlerContext {
  client: IUiSettingsClient;
}

/**
 * Implementation of {@link PrebootUiSettingsRequestHandlerContext}
 * @internal
 */
class PrebootCoreUiSettingsRouteHandlerContext implements PrebootUiSettingsRequestHandlerContext {
  constructor(public readonly client: IUiSettingsClient) {}
}

/**
 * @public
 */
export interface PrebootCoreRequestHandlerContext {
  uiSettings: PrebootUiSettingsRequestHandlerContext;
}

/**
 * Implementation of {@link PrebootCoreRequestHandlerContext}.
 * @internal
 */
export class PrebootCoreRouteHandlerContext implements PrebootCoreRequestHandlerContext {
  readonly uiSettings: PrebootUiSettingsRequestHandlerContext;

  constructor(private readonly corePreboot: InternalCorePreboot) {
    this.uiSettings = new PrebootCoreUiSettingsRouteHandlerContext(
      this.corePreboot.uiSettings.createDefaultsClient()
    );
  }
}
