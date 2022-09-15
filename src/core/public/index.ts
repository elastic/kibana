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

import type {
  InjectedMetadataSetup,
  InjectedMetadataStart,
} from '@kbn/core-injected-metadata-browser';
import { DocLinksStart } from '@kbn/core-doc-links-browser';
import type { ThemeServiceSetup, ThemeServiceStart } from '@kbn/core-theme-browser';
import type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
import { ExecutionContextSetup, ExecutionContextStart } from '@kbn/core-execution-context-browser';
import type { HttpSetup, HttpStart } from '@kbn/core-http-browser';
import type { I18nStart } from '@kbn/core-i18n-browser';

import type {
  FatalErrorsSetup,
  FatalErrorsStart,
  FatalErrorInfo,
} from '@kbn/core-fatal-errors-browser';
import type { UiSettingsState, IUiSettingsClient } from '@kbn/core-ui-settings-browser';
import type { DeprecationsServiceStart } from '@kbn/core-deprecations-browser';
import type { Capabilities } from '@kbn/core-capabilities-common';
import type { OverlayStart } from '@kbn/core-overlays-browser';
import type { SavedObjectsStart } from '@kbn/core-saved-objects-browser';
import type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
import type { ApplicationSetup, ApplicationStart } from '@kbn/core-application-browser';
import type {
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
  ChromeHelpMenuActions,
} from '@kbn/core-chrome-browser';
import type {
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginOpaqueId,
} from './plugins';

export type { PackageInfo, EnvironmentMode } from '@kbn/config';
export type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
export type { CoreContext } from '@kbn/core-base-browser-internal';
export { DEFAULT_APP_CATEGORIES, APP_WRAPPER_CLASS } from '@kbn/core-application-common';
export type { CoreSystem } from './core_system';
export type { AppCategory } from '../types';
export type {
  UiSettingsParams,
  PublicUiSettingsParams,
  UserProvidedValues,
  UiSettingsType,
} from '@kbn/core-ui-settings-common';

export type { AnalyticsServiceSetup, AnalyticsServiceStart } from '@kbn/core-analytics-browser';
export type {
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
  TelemetryCounterType,
} from '@kbn/analytics-client';

export { AppNavLinkStatus, AppStatus } from '@kbn/core-application-browser';
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
  NavigateToUrlOptions,
  ScopedHistory,
} from '@kbn/core-application-browser';
export { CoreScopedHistory } from '@kbn/core-application-browser-internal';

export type {
  SavedObjectsClientContract,
  SimpleSavedObject,
  SavedObjectsCreateOptions,
  SavedObjectsDeleteOptions,
  SavedObjectsBatchResponse,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsUpdateOptions,
  ResolvedSimpleSavedObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsFindResponse,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkResolveResponse,
  SavedObjectsBulkCreateObject,
} from '@kbn/core-saved-objects-api-browser';
export type {
  SavedObject,
  SavedObjectTypeIdTuple,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
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
} from '@kbn/core-saved-objects-common';

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
  IHttpResponseInterceptorOverrides,
} from '@kbn/core-http-browser';

export type { IHttpFetchError } from '@kbn/core-http-browser';

export type {
  OverlayStart,
  OverlayBannersStart,
  OverlayFlyoutStart,
  OverlayFlyoutOpenOptions,
  OverlayModalOpenOptions,
  OverlayModalConfirmOptions,
  OverlayModalStart,
} from '@kbn/core-overlays-browser';

export type {
  Toast,
  ToastInput,
  IToasts,
  ToastInputFields,
  ToastsSetup,
  ToastsStart,
  ToastOptions,
  ErrorToastOptions,
} from '@kbn/core-notifications-browser';

export type { ToastsApi } from '@kbn/core-notifications-browser-internal';

export type { ThemeServiceSetup, ThemeServiceStart, CoreTheme } from '@kbn/core-theme-browser';

export type {
  DeprecationsServiceStart,
  ResolveDeprecationResponse,
} from '@kbn/core-deprecations-browser';

export type { MountPoint, UnmountCallback, OverlayRef } from '@kbn/core-mount-utils-browser';

export { URL_MAX_LENGTH } from '@kbn/core-apps-browser-internal';

export type { KibanaExecutionContext } from '@kbn/core-execution-context-common';

export type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from '@kbn/core-execution-context-browser';

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
  /** {@link InjectedMetadataSetup} */
  injectedMetadata: InjectedMetadataSetup;
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
  /** {@link InjectedMetadataStart} */
  injectedMetadata: InjectedMetadataStart;
}

export type {
  Capabilities,
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeHelpMenuActions,
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
};

export { __kbnBootstrap__ } from './kbn_bootstrap';
