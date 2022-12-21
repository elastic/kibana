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

export type { DocLinksStart } from '@kbn/core-doc-links-browser';
export type { HttpSetup, HttpStart } from '@kbn/core-http-browser';
export type { I18nStart } from '@kbn/core-i18n-browser';
export type {
  FatalErrorsSetup,
  FatalErrorsStart,
  FatalErrorInfo,
} from '@kbn/core-fatal-errors-browser';
export type { UiSettingsState, IUiSettingsClient } from '@kbn/core-ui-settings-browser';
export type { Capabilities } from '@kbn/core-capabilities-common';
export type { SavedObjectsStart } from '@kbn/core-saved-objects-browser';
export type { NotificationsSetup, NotificationsStart } from '@kbn/core-notifications-browser';
export type {
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
export type {
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
} from '@kbn/core-plugins-browser';
export type { PluginOpaqueId } from '@kbn/core-base-common';

export type { PackageInfo, EnvironmentMode } from '@kbn/config';
export type { DomainDeprecationDetails } from '@kbn/core-deprecations-common';
export type { CoreContext } from '@kbn/core-base-browser-internal';
export {
  DEFAULT_APP_CATEGORIES,
  APP_WRAPPER_CLASS,
  type AppCategory,
} from '@kbn/core-application-common';
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

export type { CoreSetup, CoreStart, StartServicesAccessor } from '@kbn/core-lifecycle-browser';

export type { CoreSystem } from '@kbn/core-root-browser-internal';

export { __kbnBootstrap__ } from '@kbn/core-root-browser-internal';
