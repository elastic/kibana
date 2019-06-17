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

/**
 * The Kibana Core APIs for client-side plugins.
 *
 * A plugin's `public/index` file must contain a named import, `plugin`, that
 * implements {@link PluginInitializer} which returns an object that implements
 * {@link Plugin}.
 *
 * The plugin integrates with the core system via lifecycle events: `setup`,
 * `start`, and `stop`. In each lifecycle method, the plugin will receive the
 * corresponding core services available (either {@link CoreSetup} or
 * {@link CoreStart}) and any interfaces returned by dependency plugins'
 * lifecycle method. Anything returned by the plugin's lifecycle method will be
 * exposed to downstream dependencies when their corresponding lifecycle methods
 * are invoked.
 *
 * @packageDocumentation
 */

import {
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeNavLink,
  ChromeStart,
} from './chrome';
import { FatalErrorsSetup, FatalErrorInfo } from './fatal_errors';
import { HttpServiceBase, HttpSetup, HttpStart, HttpInterceptor } from './http';
import { I18nStart } from './i18n';
import { InjectedMetadataSetup, InjectedMetadataStart, LegacyNavLink } from './injected_metadata';
import {
  ErrorToastOptions,
  NotificationsSetup,
  NotificationsStart,
  Toast,
  ToastInput,
  ToastsApi,
} from './notifications';
import { OverlayRef, OverlayStart } from './overlays';
import { Plugin, PluginInitializer, PluginInitializerContext } from './plugins';
import { UiSettingsClient, UiSettingsSetup, UiSettingsState } from './ui_settings';
import { ApplicationSetup, Capabilities, ApplicationStart } from './application';

export { CoreContext, CoreSystem } from './core_system';
export { RecursiveReadonly } from '../utils';

/**
 * Core services exposed to the `Plugin` setup lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreSetup {
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link UiSettingsSetup} */
  uiSettings: UiSettingsSetup;
}

/**
 * Core services exposed to the `Plugin` start lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreStart {
  /** {@link ApplicationStart} */
  application: Pick<ApplicationStart, 'capabilities'>;
  /** {@link ChromeStart} */
  chrome: ChromeStart;
  /** {@link HttpStart} */
  http: HttpStart;
  /** {@link I18nStart} */
  i18n: I18nStart;
  /** {@link NotificationsStart} */
  notifications: NotificationsStart;
  /** {@link OverlayStart} */
  overlays: OverlayStart;
}

/** @internal */
export interface InternalCoreSetup extends CoreSetup {
  application: ApplicationSetup;
  injectedMetadata: InjectedMetadataSetup;
}

/** @internal */
export interface InternalCoreStart extends CoreStart {
  application: ApplicationStart;
  injectedMetadata: InjectedMetadataStart;
}

export {
  ApplicationSetup,
  ApplicationStart,
  HttpServiceBase,
  HttpSetup,
  HttpStart,
  HttpInterceptor,
  ErrorToastOptions,
  FatalErrorsSetup,
  FatalErrorInfo,
  Capabilities,
  ChromeStart,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeBrand,
  ChromeHelpExtension,
  ChromeNavLink,
  I18nStart,
  LegacyNavLink,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  NotificationsSetup,
  NotificationsStart,
  OverlayRef,
  OverlayStart,
  Toast,
  ToastInput,
  ToastsApi,
  UiSettingsClient,
  UiSettingsState,
  UiSettingsSetup,
};
