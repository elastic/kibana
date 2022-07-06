/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { CoreSavedObjectsRouteHandlerContext } from '../saved_objects';
import type { IUiSettingsClient, InternalUiSettingsServiceStart } from './types';

/**
 * Core's `uiSettings` request handler context.
 * @public
 */
export interface UiSettingsRequestHandlerContext {
  client: IUiSettingsClient;
}

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
