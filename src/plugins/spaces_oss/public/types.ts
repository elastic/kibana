/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { SpacesApi } from './api';

export interface SpacesAvailableStartContract extends SpacesApi {
  isSpacesAvailable: true;
}

export interface SpacesUnavailableStartContract {
  isSpacesAvailable: false;
}

export interface SpacesOssPluginSetup {
  /**
   * Register a provider for the Spaces API.
   *
   * Only one provider can be registered, subsequent calls to this method will fail.
   */
  registerSpacesApi(provider: SpacesApi): void;
}

export type SpacesOssPluginStart = SpacesAvailableStartContract | SpacesUnavailableStartContract;
