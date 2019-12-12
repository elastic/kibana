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
  ChromeHelpExtensionMenuLink,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeNavLinkUpdateableFields,
  ChromeDocTitle,
  ChromeStart,
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
} from './chrome';
import { FatalErrorsSetup, FatalErrorInfo } from './fatal_errors';
import { HttpSetup, HttpStart } from './http';
import { I18nStart } from './i18n';
import { InjectedMetadataSetup, InjectedMetadataStart, LegacyNavLink } from './injected_metadata';
import { NotificationsSetup, NotificationsStart } from './notifications';
import { OverlayStart } from './overlays';
import { Plugin, PluginInitializer, PluginInitializerContext, PluginOpaqueId } from './plugins';
import { UiSettingsState, IUiSettingsClient } from './ui_settings';
import { ApplicationSetup, Capabilities, ApplicationStart } from './application';
import { DocLinksStart } from './doc_links';
import { SavedObjectsStart } from './saved_objects';
export { PackageInfo, EnvironmentMode } from '../server/types';
import {
  IContextContainer,
  IContextProvider,
  ContextSetup,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';

/** @interal */
export { CoreContext, CoreSystem } from './core_system';
export { RecursiveReadonly } from '../utils';

export {
  ApplicationSetup,
  ApplicationStart,
  App,
  AppBase,
  AppMount,
  AppMountDeprecated,
  AppUnmount,
  AppMountContext,
  AppMountParameters,
} from './application';

export {
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponsePublic,
  SavedObjectsUpdateOptions,
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
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
  IHttpResponse,
  HttpHandler,
  IBasePath,
  IAnonymousPaths,
  IHttpInterceptController,
  IHttpFetchError,
  IHttpResponseInterceptorOverrides,
} from './http';

export { OverlayStart, OverlayBannersStart, OverlayRef } from './overlays';

export {
  Toast,
  ToastInput,
  IToasts,
  ToastsApi,
  ToastInputFields,
  ToastsSetup,
  ToastsStart,
  ErrorToastOptions,
} from './notifications';

export { MountPoint, UnmountCallback } from './types';

/**
 * Core services exposed to the `Plugin` setup lifecycle
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreSetup<TPluginsStart extends object = object> {
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /**
   * {@link ContextSetup}
   * @deprecated
   */
  context: ContextSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link IUiSettingsClient} */
  uiSettings: IUiSettingsClient;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform. Use the legacy platform API instead.
   * @deprecated
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };

  /**
   * Allows plugins to get access to APIs available in start inside async
   * handlers, such as {@link App.mount}. Promise will not resolve until Core
   * and plugin dependencies have completed `start`.
   */
  getStartServices(): Promise<[CoreStart, TPluginsStart]>;
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
  /** {@link IUiSettingsClient} */
  uiSettings: IUiSettingsClient;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform. Use the legacy platform API instead.
   * @deprecated
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };
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
export interface LegacyCoreSetup extends CoreSetup<any> {
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
  Capabilities,
  ChromeBadge,
  ChromeBrand,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeHelpExtensionMenuLink,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeNavLinkUpdateableFields,
  ChromeDocTitle,
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
  IUiSettingsClient,
  UiSettingsState,
};
