/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

export { uiSettingsConfig } from './ui_settings_config';
export { UiSettingsService } from './ui_settings_service';
export { CoreUiSettingsRouteHandlerContext } from './ui_settings_route_handler_context';
export { UiSettingsClient, UiSettingsGlobalClient } from './clients';
export type {
  InternalUiSettingsServicePreboot,
  InternalUiSettingsServiceSetup,
  InternalUiSettingsServiceStart,
  UiSettingsServiceOptions,
} from './types';
export { CannotOverrideError, SettingNotRegisteredError } from './ui_settings_errors';
