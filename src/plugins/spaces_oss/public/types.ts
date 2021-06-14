/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { SpacesApi } from './api';

/**
 * OSS Spaces plugin start contract when the Spaces feature is enabled.
 */
export interface SpacesAvailableStartContract extends SpacesApi {
  /** Indicates if the Spaces feature is enabled. */
  isSpacesAvailable: true;
}

/**
 * OSS Spaces plugin start contract when the Spaces feature is disabled.
 * @deprecated The Spaces plugin will always be enabled starting in 8.0.
 * @removeBy 8.0
 */
export interface SpacesUnavailableStartContract {
  /** Indicates if the Spaces feature is enabled. */
  isSpacesAvailable: false;
}

/**
 * OSS Spaces plugin setup contract.
 */
export interface SpacesOssPluginSetup {
  /**
   * Register a provider for the Spaces API.
   *
   * Only one provider can be registered, subsequent calls to this method will fail.
   *
   * @param provider the API provider.
   *
   * @private designed to only be consumed by the `spaces` plugin.
   */
  registerSpacesApi(provider: SpacesApi): void;
}

/**
 * OSS Spaces plugin start contract.
 */
export type SpacesOssPluginStart = SpacesAvailableStartContract | SpacesUnavailableStartContract;
