/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

// eslint-disable-next-line max-classes-per-file
import { InternalCorePreboot } from './internal_types';
import { InternalUiSettingsServicePreboot, IUiSettingsClient } from './ui_settings';

class PrebootCoreUiSettingsRouteHandlerContext {
  #client?: IUiSettingsClient;
  constructor(private readonly uiSettingsPreboot: InternalUiSettingsServicePreboot) {}

  public get client() {
    if (this.#client == null) {
      this.#client = this.uiSettingsPreboot.defaultsClient();
    }
    return this.#client;
  }
}

export class PrebootCoreRouteHandlerContext {
  readonly uiSettings: PrebootCoreUiSettingsRouteHandlerContext;

  constructor(private readonly corePreboot: InternalCorePreboot) {
    this.uiSettings = new PrebootCoreUiSettingsRouteHandlerContext(this.corePreboot.uiSettings);
  }
}
