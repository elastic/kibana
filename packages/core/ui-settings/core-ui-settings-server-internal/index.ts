/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

export {
  uiSettingsConfig,
  UiSettingsClient,
  UiSettingsService,
  UiSettingsGlobalClient,
  CoreUiSettingsRouteHandlerContext,
} from './src';
export type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
  UiSettingsServiceOptions,
} from './src';

// only exported for integration tests
export { createOrUpgradeSavedConfig } from './src/create_or_upgrade_saved_config';
