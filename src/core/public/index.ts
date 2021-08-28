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

import type { PluginOpaqueId } from '../server/plugins/types';
import type { Capabilities } from '../types/capabilities';
import type { ChromeDocTitle } from './chrome/doc_title/doc_title_service';
import type {
  ChromeNavControl,
  ChromeNavControls,
} from './chrome/nav_controls/nav_controls_service';
import type { ChromeNavLink } from './chrome/nav_links/nav_link';
import type { ChromeNavLinks } from './chrome/nav_links/nav_links_service';
import type {
  ChromeRecentlyAccessed,
  ChromeRecentlyAccessedHistoryItem,
} from './chrome/recently_accessed/recently_accessed_service';
import type {
  ChromeBadge,
  ChromeBreadcrumb,
  ChromeHelpExtension,
  ChromeStart,
  ChromeUserBanner,
} from './chrome/types';
import type {
  ChromeHelpExtensionLinkBase,
  ChromeHelpExtensionMenuCustomLink,
  ChromeHelpExtensionMenuDiscussLink,
  ChromeHelpExtensionMenuDocumentationLink,
  ChromeHelpExtensionMenuGitHubLink,
  ChromeHelpExtensionMenuLink,
} from './chrome/ui/header/header_help_menu';
import type { NavType } from './chrome/ui/header/types';
import type { DocLinksStart } from './doc_links/doc_links_service';
import type { FatalErrorsSetup, FatalErrorsStart } from './fatal_errors/fatal_errors_service';
import type { FatalErrorInfo } from './fatal_errors/get_error_info';
import type { HttpSetup, HttpStart } from './http/types';
import type { I18nStart } from './i18n/i18n_service';
import './index.scss';
import type { NotificationsSetup, NotificationsStart } from './notifications/notifications_service';
import type { AsyncPlugin, Plugin, PluginInitializer } from './plugins/plugin';
import type { PluginInitializerContext } from './plugins/plugin_context';
import type { SavedObjectsStart } from './saved_objects/saved_objects_service';
import type { IUiSettingsClient, UiSettingsState } from './ui_settings/types';

export type {
  DomainDeprecationDetails,
  EnvironmentMode,
  IExternalUrlPolicy,
  PackageInfo,
} from '../server/types';
export type { AppCategory, UiSettingsParams, UiSettingsType, UserProvidedValues } from '../types';
export { APP_WRAPPER_CLASS, DEFAULT_APP_CATEGORIES } from '../utils';
export { AppNavLinkStatus, AppStatus, ScopedHistory } from './application';
export type {
  App,
  AppDeepLink,
  AppLeaveAction,
  AppLeaveActionType,
  AppLeaveConfirmAction,
  AppLeaveDefaultAction,
  AppLeaveHandler,
  ApplicationSetup,
  ApplicationStart,
  AppMount,
  AppMountParameters,
  AppNavOptions,
  AppUnmount,
  AppUpdatableFields,
  AppUpdater,
  NavigateToAppOptions,
  PublicAppDeepLinkInfo,
  PublicAppInfo,
} from './application';
export { URL_MAX_LENGTH } from './core_app';
export type { CoreContext, CoreSystem } from './core_system';
export type { DeprecationsServiceStart, ResolveDeprecationResponse } from './deprecations';
export type { KibanaExecutionContext } from './execution_context';
export { HttpFetchError } from './http';
export type {
  HttpFetchOptions,
  HttpFetchOptionsWithPath,
  HttpFetchQuery,
  HttpHandler,
  HttpHeadersInit,
  HttpInterceptor,
  HttpInterceptorRequestError,
  HttpInterceptorResponseError,
  HttpRequestInit,
  HttpResponse,
  IAnonymousPaths,
  IBasePath,
  IExternalUrl,
  IHttpFetchError,
  IHttpInterceptController,
  IHttpResponseInterceptorOverrides,
} from './http';
export { __kbnBootstrap__ } from './kbn_bootstrap';
export type {
  ErrorToastOptions,
  IToasts,
  Toast,
  ToastInput,
  ToastInputFields,
  ToastOptions,
  ToastsApi,
  ToastsSetup,
  ToastsStart,
} from './notifications';
export type {
  OverlayBannersStart,
  OverlayFlyoutOpenOptions,
  OverlayFlyoutStart,
  OverlayModalConfirmOptions,
  OverlayModalOpenOptions,
  OverlayModalStart,
  OverlayRef,
  OverlayStart,
} from './overlays';
export { SimpleSavedObject } from './saved_objects';
export type {
  ResolvedSimpleSavedObject,
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectError,
  SavedObjectReference,
  SavedObjectReferenceWithContext,
  SavedObjectsBaseOptions,
  SavedObjectsBatchResponse,
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkCreateOptions,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsClient,
  SavedObjectsClientContract,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsCreateOptions,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsFindResponsePublic,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportConflictError,
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsImportWarning,
  SavedObjectsMigrationVersion,
  SavedObjectsNamespaceType,
  SavedObjectsResolveResponse,
  SavedObjectsUpdateOptions,
} from './saved_objects';
export type {
  MountPoint,
  PublicUiSettingsParams,
  UnmountCallback,
  CoreStart,
  CoreSetup,
  StartServicesAccessor,
} from './types';
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
  AsyncPlugin,
  PluginInitializer,
  PluginInitializerContext,
  SavedObjectsStart,
  PluginOpaqueId,
  IUiSettingsClient,
  UiSettingsState,
  NavType,
};
