/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { BasePathSetup, BasePathStart } from './base_path';
import {
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeSetup,
} from './chrome';
import { FatalErrorsSetup, FatalErrorInfo } from './fatal_errors';
import { HttpSetup, HttpStart } from './http';
import { I18nSetup, I18nStart } from './i18n';
import {
  InjectedMetadataParams,
  InjectedMetadataSetup,
  InjectedMetadataStart,
  LegacyNavLink,
} from './injected_metadata';
import {
  NotificationsSetup,
  Toast,
  ToastInput,
  ToastsApi,
  NotificationsStart,
} from './notifications';
import { FlyoutRef, OverlayStart } from './overlays';
import {
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginSetupContext,
  PluginStartContext,
} from './plugins';
import { UiSettingsClient, UiSettingsSetup, UiSettingsState } from './ui_settings';
import { ApplicationSetup, Capabilities, ApplicationStart } from './application';

export { CoreContext, CoreSystem } from './core_system';

/**
 * Core services exposed to the setup lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreSetup {
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /** {@link I18nSetup} */
  i18n: I18nSetup;
  /** {@link InjectedMetadataSetup} */
  injectedMetadata: InjectedMetadataSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link BasePathSetup} */
  basePath: BasePathSetup;
  /** {@link UiSettingsSetup} */
  uiSettings: UiSettingsSetup;
  /** {@link ChromeSetup} */
  chrome: ChromeSetup;
}

/**
 * Core services exposed to the start lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreStart {
  /** {@link ApplicationStart} */
  application: ApplicationStart;
  /** {@link BasePathStart} */
  basePath: BasePathStart;
  /** {@link HttpStart} */
  http: HttpStart;
  /** {@link I18nStart} */
  i18n: I18nStart;
  /** {@link InjectedMetadataStart} */
  injectedMetadata: InjectedMetadataStart;
  /** {@link NotificationsStart} */
  notifications: NotificationsStart;
  /** {@link OverlayStart} */
  overlays: OverlayStart;
}

export {
  ApplicationSetup,
  ApplicationStart,
  BasePathSetup,
  BasePathStart,
  HttpSetup,
  HttpStart,
  FatalErrorsSetup,
  FatalErrorInfo,
  Capabilities,
  ChromeSetup,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBrand,
  ChromeHelpExtension,
  I18nSetup,
  I18nStart,
  InjectedMetadataSetup,
  InjectedMetadataStart,
  InjectedMetadataParams,
  LegacyNavLink,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginSetupContext,
  PluginStartContext,
  NotificationsSetup,
  NotificationsStart,
  OverlayStart,
  FlyoutRef,
  Toast,
  ToastInput,
  ToastsApi,
  UiSettingsClient,
  UiSettingsState,
  UiSettingsSetup,
};
