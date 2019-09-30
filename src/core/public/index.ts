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
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeNavLinkUpdateableFields,
  ChromeStart,
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
} from './chrome';
import { FatalErrorsSetup, FatalErrorInfo } from './fatal_errors';
import { HttpSetup, HttpStart } from './http';
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
import { OverlayStart } from './overlays';
import { Plugin, PluginInitializer, PluginInitializerContext, PluginOpaqueId } from './plugins';
import { UiSettingsClient, UiSettingsState, UiSettingsClientContract } from './ui_settings';
import { ApplicationSetup, Capabilities, ApplicationStart } from './application';
import { DocLinksStart } from './doc_links';
import { SavedObjectsStart } from './saved_objects';
import {
  IContextContainer,
  IContextProvider,
  ContextSetup,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';

export { CoreContext, CoreSystem } from './core_system';
export { RecursiveReadonly } from '../utils';

export { App, AppBase, AppUnmount, AppMountContext, AppMountParameters } from './application';

export {
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponsePublic,
  SavedObjectsUpdateOptions,
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
  SavedObjectsClientContract,
  SavedObjectsClient,
  SimpleSavedObject,
} from './saved_objects';

export {
  HttpServiceBase,
  HttpHeadersInit,
  HttpRequestInit,
  HttpFetchOptions,
  HttpFetchQuery,
  HttpErrorResponse,
  HttpErrorRequest,
  HttpInterceptor,
  HttpResponse,
  HttpHandler,
  HttpBody,
  HttpInterceptController,
} from './http';

export {
  OverlayStart,
  OverlayBannerMount,
  OverlayBannerUnmount,
  OverlayBannersStart,
  OverlayRef,
} from './overlays';

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
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /** {@link ContextSetup} */
  context: ContextSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link UiSettingsClient} */
  uiSettings: UiSettingsClientContract;
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
  application: ApplicationStart;
  /** {@link ChromeStart} */
  chrome: ChromeStart;
  /** {@link DocLinksStart} */
  docLinks: DocLinksStart;
  /** {@link HttpStart} */
  http: HttpStart;
  /** {@link SavedObjectsStart} */
  savedObjects: SavedObjectsStart;
  /** {@link I18nStart} */
  i18n: I18nStart;
  /** {@link NotificationsStart} */
  notifications: NotificationsStart;
  /** {@link OverlayStart} */
  overlays: OverlayStart;
  /** {@link UiSettingsClient} */
  uiSettings: UiSettingsClientContract;
}

/**
 * Setup interface exposed to the legacy platform via the `ui/new_platform` module.
 *
 * @remarks
 * Some methods are not supported in the legacy platform and while present to make this type compatibile with
 * {@link CoreSetup}, unsupported methods will throw exceptions when called.
 *
 * @public
 * @deprecated
 */
export interface LegacyCoreSetup extends CoreSetup {
  /** @deprecated */
  injectedMetadata: InjectedMetadataSetup;
}

/**
 * Start interface exposed to the legacy platform via the `ui/new_platform` module.
 *
 * @remarks
 * Some methods are not supported in the legacy platform and while present to make this type compatibile with
 * {@link CoreStart}, unsupported methods will throw exceptions when called.
 *
 * @public
 * @deprecated
 */
export interface LegacyCoreStart extends CoreStart {
  /** @deprecated */
  injectedMetadata: InjectedMetadataStart;
}

export {
  ApplicationSetup,
  ApplicationStart,
  Capabilities,
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeNavLinkUpdateableFields,
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
  ChromeStart,
  IContextContainer,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
  IContextProvider,
  ContextSetup,
  DocLinksStart,
  ErrorToastOptions,
  FatalErrorInfo,
  FatalErrorsSetup,
  HttpSetup,
  HttpStart,
  I18nStart,
  LegacyNavLink,
  NotificationsSetup,
  NotificationsStart,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  SavedObjectsStart,
  PluginOpaqueId,
  Toast,
  ToastInput,
  ToastsApi,
  UiSettingsClient,
  UiSettingsClientContract,
  UiSettingsState,
};
