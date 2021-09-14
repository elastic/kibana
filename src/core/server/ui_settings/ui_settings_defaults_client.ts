/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { UiSettingsParams, UserProvidedValues } from './types';
import { Logger } from '../logging';
import { BaseUiSettingsClient } from './base_ui_settings_client';

export interface UiSettingsDefaultsClientOptions {
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}

/**
 * Implementation of the {@link IUiSettingsClient} that only gives a read-only access to the default UI Settings values and any overrides.
 */
export class UiSettingsDefaultsClient extends BaseUiSettingsClient {
  private readonly userProvided: Record<string, UserProvidedValues<unknown>>;

  constructor(options: UiSettingsDefaultsClientOptions) {
    super(options);

    // The only "userProvided" settings `UiSettingsDefaultsClient` is aware about are explicit overrides.
    this.userProvided = Object.fromEntries(
      Object.entries(this.overrides).map(([key, value]) => [
        key,
        // Dropping the userValue if override is null
        value === null ? { isOverridden: true } : { isOverridden: true, userValue: value },
      ])
    );
  }

  async getUserProvided<T = unknown>(): Promise<Record<string, UserProvidedValues<T>>> {
    return this.userProvided as Record<string, UserProvidedValues<T>>;
  }

  // Any mutating operations are not supported by default UI settings.
  async setMany() {
    this.log.warn('`setMany` operation is not supported.');
  }

  async set() {
    this.log.warn('`set` operation is not supported.');
  }

  async remove() {
    this.log.warn('`remove` operation is not supported.');
  }

  async removeMany() {
    this.log.warn('`removeMany` operation is not supported.');
  }
}
