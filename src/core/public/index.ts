/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
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

import './index.scss';

import {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeHelpExtensionMenuLink,
  ChromeHelpExtensionLinkBase,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeDocTitle,
  ChromeStart,
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
  ChromeUserBanner,
  NavType,
} from './chrome';
import { FatalErrorsSetup, FatalErrorsStart, FatalErrorInfo } from './fatal_errors';
import { HttpSetup, HttpStart } from './http';
import { I18nStart } from './i18n';
import { NotificationsSetup, NotificationsStart } from './notifications';
import { OverlayStart } from './overlays';
import { Plugin, PluginInitializer, PluginInitializerContext, PluginOpaqueId } from './plugins';
import { UiSettingsState, IUiSettingsClient } from './ui_settings';
import { ApplicationSetup, Capabilities, ApplicationStart } from './application';
import { DocLinksStart } from './doc_links';
import { SavedObjectsStart } from './saved_objects';
import { DeprecationsServiceStart } from './deprecations';
import type { ThemeServiceSetup, ThemeServiceStart } from './theme';
import { ExecutionContextSetup, ExecutionContextStart } from './execution_context';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from './analytics';

export type {
  PackageInfo,
  EnvironmentMode,
  IExternalUrlPolicy,
  DomainDeprecationDetails,
} from '../server/types';
export type { CoreContext, CoreSystem } from './core_system';
export { DEFAULT_APP_CATEGORIES, APP_WRAPPER_CLASS } from '../utils';
export type { AppCategory, UiSettingsParams, UserProvidedValues, UiSettingsType } from '../types';

export type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  AnalyticsClient,
  Event,
  EventContext,
  EventType,
  EventTypeOpts,
  IShipper,
  ShipperClassConstructor,
  OptInConfig,
  ContextProviderOpts,
  TelemetryCounter,
} from './analytics';
export { TelemetryCounterType } from './analytics';

export { AppNavLinkStatus, AppStatus, ScopedHistory } from './application';
export type {
  ApplicationSetup,
  ApplicationStart,
  App,
  AppMount,
  AppUnmount,
  AppMountParameters,
  AppLeaveHandler,
  AppLeaveActionType,
  AppLeaveAction,
  AppLeaveDefaultAction,
  AppLeaveConfirmAction,
  AppUpdatableFields,
  AppUpdater,
  AppNavOptions,
  AppDeepLink,
  PublicAppInfo,
  PublicAppDeepLinkInfo,
  NavigateToAppOptions,
} from './application';

export { SimpleSavedObject } from './saved_objects';
export type { ResolvedSimpleSavedObject } from './saved_objects';
export type {
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsCreateOptions,
  SavedObjectsFindResponsePublic,
  SavedObjectsResolveResponse,
  SavedObjectsUpdateOptions,
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsMigrationVersion,
  SavedObjectsClientContract,
  SavedObjectsClient,
  SavedObjectsImportResponse,
  SavedObjectsImportSuccess,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportUnknownError,
  SavedObjectsImportFailure,
  SavedObjectsImportRetry,
  SavedObjectsNamespaceType,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportWarning,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
} from './saved_objects';

export { HttpFetchError } from './http';

export type {
  HttpHeadersInit,
  HttpRequestInit,
  HttpFetchOptions,
  HttpFetchOptionsWithPath,
  HttpFetchQuery,
  HttpInterceptorResponseError,
  HttpInterceptorRequestError,
  HttpInterceptor,
  HttpResponse,
  HttpHandler,
  IBasePath,
  IAnonymousPaths,
  IExternalUrl,
  IHttpInterceptController,
  ResponseErrorBody,
  IHttpFetchError,
  IHttpResponseInterceptorOverrides,
} from './http';

export type {
  OverlayStart,
  OverlayBannersStart,
  OverlayRef,
  OverlayFlyoutStart,
  OverlayFlyoutOpenOptions,
  OverlayModalOpenOptions,
  OverlayModalConfirmOptions,
  OverlayModalStart,
} from './overlays';

export type {
  Toast,
  ToastInput,
  IToasts,
  ToastsApi,
  ToastInputFields,
  ToastsSetup,
  ToastsStart,
  ToastOptions,
  ErrorToastOptions,
} from './notifications';

export type { ThemeServiceSetup, ThemeServiceStart, CoreTheme } from './theme';

export type { DeprecationsServiceStart, ResolveDeprecationResponse } from './deprecations';

export type { MountPoint, UnmountCallback, PublicUiSettingsParams } from './types';

export { URL_MAX_LENGTH } from './core_app';

export type {
  KibanaExecutionContext,
  ExecutionContextSetup,
  ExecutionContextStart,
} from './execution_context';

/**
 * Core services exposed to the `Plugin` setup lifecycle
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 *
 * @public
 *
 * @internalRemarks We document the properties with \@link tags to improve
 * navigation in the generated docs until there's a fix for
 * https://github.com/Microsoft/web-build-tools/issues/1237
 */
export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link AnalyticsServiceSetup} */
  analytics: AnalyticsServiceSetup;
  /** {@link ApplicationSetup} */
  application: ApplicationSetup;
  /** {@link FatalErrorsSetup} */
  fatalErrors: FatalErrorsSetup;
  /** {@link HttpSetup} */
  http: HttpSetup;
  /** {@link NotificationsSetup} */
  notifications: NotificationsSetup;
  /** {@link IUiSettingsClient} */
  uiSettings: IUiSettingsClient;
  /** {@link ExecutionContextSetup} */
  executionContext: ExecutionContextSetup;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform.
   * @deprecated
   * @removeBy 8.8.0
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };
  /** {@link ThemeServiceSetup} */
  theme: ThemeServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
}

/**
 * Allows plugins to get access to APIs available in start inside async
 * handlers, such as {@link App.mount}. Promise will not resolve until Core
 * and plugin dependencies have completed `start`.
 *
 * @public
 */
export type StartServicesAccessor<
  TPluginsStart extends object = object,
  TStart = unknown
> = () => Promise<[CoreStart, TPluginsStart, TStart]>;

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
  /** {@link AnalyticsServiceStart} */
  analytics: AnalyticsServiceStart;
  /** {@link ApplicationStart} */
  application: ApplicationStart;
  /** {@link ChromeStart} */
  chrome: ChromeStart;
  /** {@link DocLinksStart} */
  docLinks: DocLinksStart;
  /** {@link ExecutionContextStart} */
  executionContext: ExecutionContextStart;
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
  /** {@link FatalErrorsStart} */
  fatalErrors: FatalErrorsStart;
  /** {@link DeprecationsServiceStart} */
  deprecations: DeprecationsServiceStart;
  /** {@link ThemeServiceStart} */
  theme: ThemeServiceStart;
  /**
   * exposed temporarily until https://github.com/elastic/kibana/issues/41990 done
   * use *only* to retrieve config values. There is no way to set injected values
   * in the new platform.
   * @deprecated
   * @removeBy 8.8.0
   * */
  injectedMetadata: {
    getInjectedVar: (name: string, defaultValue?: any) => unknown;
  };
}

export type {
  Capabilities,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeHelpExtensionMenuLink,
  ChromeHelpExtensionLinkBase,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeNavControl,
  ChromeNavControls,
  ChromeNavLink,
  ChromeNavLinks,
  ChromeDocTitle,
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
  ChromeUserBanner,
  ChromeStart,
  DocLinksStart,
  FatalErrorInfo,
  FatalErrorsSetup,
  FatalErrorsStart,
  HttpSetup,
  HttpStart,
  I18nStart,
  NotificationsSetup,
  NotificationsStart,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  SavedObjectsStart,
  PluginOpaqueId,
  IUiSettingsClient,
  UiSettingsState,
  NavType,
};

export { __kbnBootstrap__ } from './kbn_bootstrap';
