/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  IUiSettingsClient,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
} from '@kbn/core-ui-settings-server';
import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import type { UiSettingsParams } from '@kbn/core-ui-settings-common';
import type { Logger } from '@kbn/logging';

/** @internal */
export interface InternalUiSettingsServicePreboot {
  /**
   * Creates a {@link IUiSettingsClient} that returns default values for the Core uiSettings.
   */
  createDefaultsClient(): IUiSettingsClient;
}

/** @internal */
export type InternalUiSettingsServiceSetup = UiSettingsServiceSetup;

/** @internal */
export type InternalUiSettingsServiceStart = UiSettingsServiceStart;

/** @internal */
export interface UiSettingsServiceOptions {
  type: 'config' | 'config-global';
  id: string;
  buildNum: number;
  savedObjectsClient: SavedObjectsClientContract;
  overrides?: Record<string, any>;
  defaults?: Record<string, UiSettingsParams>;
  log: Logger;
}
