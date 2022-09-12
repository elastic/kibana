/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSavedObjectsRouteHandlerContext } from '@kbn/core-saved-objects-server-internal';
import type {
  UiSettingsRequestHandlerContext,
  IUiSettingsClient,
} from '@kbn/core-ui-settings-server';
import type { InternalUiSettingsServiceStart } from './types';

/**
 * The {@link UiSettingsRequestHandlerContext} implementation.
 * @internal
 */
export class CoreUiSettingsRouteHandlerContext implements UiSettingsRequestHandlerContext {
  #client?: IUiSettingsClient;

  constructor(
    private readonly uiSettingsStart: InternalUiSettingsServiceStart,
    private readonly savedObjectsRouterHandlerContext: CoreSavedObjectsRouteHandlerContext
  ) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.uiSettingsStart.asScopedToClient(
        this.savedObjectsRouterHandlerContext.client
      );
    }
    return this.#client;
  }
}
