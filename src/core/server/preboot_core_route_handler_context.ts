/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { InternalCorePreboot } from './internal_types';
import { IUiSettingsClient } from './ui_settings';

/**
 * @public
 */
export interface PrebootUiSettingsRequestHandlerContext {
  client: IUiSettingsClient;
}

/**
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
