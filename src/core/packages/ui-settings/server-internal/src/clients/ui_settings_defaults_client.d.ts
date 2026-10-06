/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Logger } from '@kbn/logging';
import type { UiSettingsParams, UserProvidedValues } from '@kbn/core-ui-settings-common';
import { BaseUiSettingsClient } from './base_ui_settings_client';
export interface UiSettingsDefaultsClientOptions {
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}
/**
 * Implementation of the {@link IUiSettingsClient} that only gives a read-only access to the default UI Settings values and any overrides.
 */
export declare class UiSettingsDefaultsClient extends BaseUiSettingsClient {
  private readonly userProvided;
  constructor(options: UiSettingsDefaultsClientOptions);
  getUserProvided<T = unknown>(): Promise<Record<string, UserProvidedValues<T>>>;
  setMany(): Promise<void>;
  set(): Promise<void>;
  remove(): Promise<void>;
  removeMany(): Promise<void>;
}
