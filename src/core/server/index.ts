/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

/**
 * The Kibana Core APIs for server-side plugins.
 *
 * A plugin requires a `kibana.json` file at it's root directory that follows
 * {@link PluginManifest | the manfiest schema} to define static plugin
 * information required to load the plugin.
 *
 * A plugin's `server/index` file must contain a named import, `plugin`, that
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

import { Type } from '@kbn/config-schema';
import type { DocLinksServiceStart, DocLinksServiceSetup } from '@kbn/core-doc-links-server';
import type { AppenderConfigType, LoggingServiceSetup } from '@kbn/core-logging-server';
import { appendersSchema } from '@kbn/core-logging-server-internal';
import type {
  AnalyticsServiceSetup,
  AnalyticsServiceStart,
  AnalyticsServicePreboot,
} from '@kbn/core-analytics-server';
import type {
  ExecutionContextSetup,
  ExecutionContextStart,
} from '@kbn/core-execution-context-server';
import type {
  IRouter,
  RequestHandler,
  KibanaResponseFactory,
  RouteMethod,
  HttpServicePreboot,
  HttpServiceSetup,
  HttpServiceStart,
} from '@kbn/core-http-server';
import type { PrebootServicePreboot } from '@kbn/core-preboot-server';
import type { MetricsServiceSetup, MetricsServiceStart } from '@kbn/core-metrics-server';
import {
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchServicePreboot,
} from '@kbn/core-elasticsearch-server';
import { configSchema as elasticsearchConfigSchema } from '@kbn/core-elasticsearch-server-internal';
import type { CapabilitiesSetup, CapabilitiesStart } from '@kbn/core-capabilities-server';
import type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
} from '@kbn/core-saved-objects-server';
import type { DeprecationsServiceSetup } from '@kbn/core-deprecations-server';
import type { CoreUsageDataStart, CoreUsageDataSetup } from '@kbn/core-usage-data-server';
import type { I18nServiceSetup } from '@kbn/core-i18n-server';
import type { StatusServiceSetup } from '@kbn/core-status-server';
import type { UiSettingsServiceSetup, UiSettingsServiceStart } from '@kbn/core-ui-settings-server';
import type { RequestHandlerContext } from '@kbn/core-http-request-handler-context-server';
import type { HttpResources } from '@kbn/core-http-resources-server';
import { PluginsServiceSetup, PluginsServiceStart } from './plugins';

export type { PluginOpaqueId } from '@kbn/core-base-common';
export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
  CoreUsageDataSetup,
  CoreUsageDataStart,
  CoreUsageCounter,
  CoreIncrementUsageCounter,
  CoreIncrementCounterParams,
} from '@kbn/core-usage-data-server';

export type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export type { IExecutionContextContainer } from '@kbn/core-execution-context-server';

export { bootstrap } from './bootstrap';
export type { Capabilities } from '@kbn/core-capabilities-common';
export type {
  CapabilitiesProvider,
  CapabilitiesSwitcher,
  ResolveCapabilitiesOptions,
} from '@kbn/core-capabilities-server';
export type {
  ConfigPath,
  ConfigService,
  ConfigDeprecation,
  ConfigDeprecationContext,
  ConfigDeprecationProvider,
  ConfigDeprecationFactory,
  AddConfigDeprecation,
  EnvironmentMode,
  PackageInfo,
} from '@kbn/config';

export type { CoreId } from '@kbn/core-base-common-internal';

export { ElasticsearchConfig, pollEsNodesVersion } from '@kbn/core-elasticsearch-server-internal';
export type {
  NodesVersionCompatibility,
  PollEsNodesVersionOptions,
} from '@kbn/core-elasticsearch-server-internal';
export type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchConfigPreboot,
  ElasticsearchRequestHandlerContext,
  FakeRequest,
  ScopeableRequest,
  ElasticsearchClient,
  IClusterClient,
  ICustomClusterClient,
  ElasticsearchClientConfig,
  ElasticsearchClientSslConfig,
  IScopedClusterClient,
  UnauthorizedErrorHandlerOptions,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandler,
} from '@kbn/core-elasticsearch-server';

export { CspConfig } from '@kbn/core-http-server-internal';
export { CoreKibanaRequest, kibanaResponseFactory } from '@kbn/core-http-router-server-internal';

export type {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthToolkit,
  AuthResultRedirected,
  AuthRedirectedParams,
  AuthResult,
  AuthResultType,
  AuthResultAuthenticated,
  AuthResultNotHandled,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
  DestructiveRouteMethod,
  SafeRouteMethod,
  KibanaRequest,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  KibanaResponseFactory,
  RouteConfig,
  RouteRegistrar,
  RouteMethod,
  RouteConfigOptions,
  RouteConfigOptionsBody,
  RouteContentType,
  RouteValidatorConfig,
  RouteValidationSpec,
  RouteValidationFunction,
  RouteValidatorOptions,
  RouteValidatorFullConfig,
  RouteValidationResultFactory,
  RouteValidationError,
  RedirectResponseOptions,
  RequestHandlerWrapper,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  IKibanaResponse,
  LifecycleResponseFactory,
  KnownHeaders,
  ErrorHttpResponseOptions,
  IKibanaSocket,
  HttpResponseOptions,
  HttpResponsePayload,
  Headers,
  CustomHttpResponseOptions,
  OnPreAuthHandler,
  OnPreAuthToolkit,
  OnPreRoutingHandler,
  OnPreRoutingToolkit,
  OnPostAuthHandler,
  OnPostAuthToolkit,
  OnPreResponseHandler,
  OnPreResponseToolkit,
  OnPreResponseRender,
  OnPreResponseExtensions,
  OnPreResponseInfo,
  ICspConfig,
  IExternalUrlConfig,
  IBasePath,
  SessionStorage,
  SessionStorageCookieOptions,
  SessionCookieValidationResult,
  SessionStorageFactory,
  GetAuthState,
  IsAuthenticated,
  AuthStatus,
  GetAuthHeaders,
  IContextContainer,
  HttpAuth,
  HttpServerInfo,
  HttpServicePreboot,
  HttpServiceStart,
} from '@kbn/core-http-server';
export type { IExternalUrlPolicy } from '@kbn/core-http-common';

export { validBodyOutput } from '@kbn/core-http-server';

export type {
  HttpResourcesRenderOptions,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
  HttpResourcesRequestHandler,
} from '@kbn/core-http-resources-server';

export type {
  LoggingServiceSetup,
  LoggerContextConfigInput,
  LoggerConfigType,
  AppenderConfigType,
} from '@kbn/core-logging-server';
export type {
  Logger,
  LoggerFactory,
  Ecs,
  EcsEventCategory,
  EcsEventKind,
  EcsEventOutcome,
  EcsEventType,
  LogMeta,
  LogRecord,
  LogLevel,
} from '@kbn/logging';

export type { NodeInfo, NodeRoles } from '@kbn/core-node-server';

export { PluginType } from '@kbn/core-base-common';

export type {
  DiscoveredPlugin,
  PrebootPlugin,
  Plugin,
  AsyncPlugin,
  PluginConfigDescriptor,
  PluginConfigSchema,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PluginName,
  SharedGlobalConfig,
  MakeUsageFromSchema,
  ExposedToBrowserDescriptor,
} from './plugins';

export type {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
  SavedObjectsMigrationVersion,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsNamespaceType,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportWarning,
} from '@kbn/core-saved-objects-common';
export type {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsClosePointInTimeResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreateOptions,
  SavedObjectsFindResult,
  SavedObjectsFindResponse,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsBulkResolveObject,
  SavedObjectsBulkResolveResponse,
  SavedObjectsResolveResponse,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsRemoveReferencesToOptions,
  SavedObjectsRemoveReferencesToResponse,
  SavedObjectsCollectMultiNamespaceReferencesObject,
  SavedObjectsCollectMultiNamespaceReferencesOptions,
  SavedObjectReferenceWithContext,
  SavedObjectsCollectMultiNamespaceReferencesResponse,
  SavedObjectsUpdateObjectsSpacesObject,
  SavedObjectsUpdateObjectsSpacesOptions,
  SavedObjectsUpdateObjectsSpacesResponse,
  SavedObjectsUpdateObjectsSpacesResponseObject,
  SavedObjectsDeleteOptions,
  ISavedObjectsRepository,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsPitParams,
  SavedObjectsBulkDeleteObject,
  SavedObjectsBulkDeleteOptions,
  SavedObjectsBulkDeleteResponse,
} from '@kbn/core-saved-objects-api-server';
export type {
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
  SavedObjectsExportResultDetails,
  SavedObjectsExportExcludedObject,
  SavedObjectsImportOptions,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
  SavedObjectsRawDoc,
  SavedObjectsRawDocSource,
  SavedObjectsRawDocParseOptions,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
  SavedObjectsRepositoryFactory,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectStatusMeta,
  SavedObjectsFieldMapping,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsMappingProperties,
  ISavedObjectTypeRegistry,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  ISavedObjectsExporter,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportTransform,
  SavedObjectsExportTransformContext,
  ISavedObjectsImporter,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsValidationMap,
  SavedObjectsValidationSpec,
  ISavedObjectsSerializer,
  SavedObjectsRequestHandlerContext,
} from '@kbn/core-saved-objects-server';
export {
  SavedObjectsErrorHelpers,
  SavedObjectsUtils,
  mergeSavedObjectMigrationMaps,
} from '@kbn/core-saved-objects-utils-server';
export { SavedObjectTypeRegistry } from '@kbn/core-saved-objects-base-server-internal';
export type { SavedObjectsRepository } from '@kbn/core-saved-objects-api-server-internal';
export { SavedObjectsClient } from '@kbn/core-saved-objects-api-server-internal';
export type {
  SavedObjectsExportError,
  SavedObjectsImportError,
} from '@kbn/core-saved-objects-import-export-server-internal';

export type {
  UiSettingsParams,
  PublicUiSettingsParams,
  UiSettingsType,
  UserProvidedValues,
  DeprecationSettings,
} from '@kbn/core-ui-settings-common';
export type {
  IUiSettingsClient,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
  UiSettingsRequestHandlerContext,
} from '@kbn/core-ui-settings-server';

export type {
  OpsMetrics,
  OpsOsMetrics,
  OpsServerMetrics,
  OpsProcessMetrics,
  MetricsServiceSetup,
  MetricsServiceStart,
  IntervalHistogram,
  IEventLoopDelaysMonitor,
} from '@kbn/core-metrics-server';
export { EventLoopDelaysMonitor } from '@kbn/core-metrics-collectors-server-internal';

export type { I18nServiceSetup } from '@kbn/core-i18n-server';
export type {
  RegisterDeprecationsConfig,
  GetDeprecationsContext,
  DeprecationsServiceSetup,
  DeprecationsClient,
  DeprecationsRequestHandlerContext,
} from '@kbn/core-deprecations-server';
export type { DeprecationsDetails } from '@kbn/core-deprecations-common';

export type { AppCategory } from '@kbn/core-application-common';
export { DEFAULT_APP_CATEGORIES, APP_WRAPPER_CLASS } from '@kbn/core-application-common';

export { ServiceStatusLevels } from '@kbn/core-status-common';
export type { CoreStatus, ServiceStatus, ServiceStatusLevel } from '@kbn/core-status-common';
export type { StatusServiceSetup } from '@kbn/core-status-server';

export type { DocLinksServiceStart, DocLinksServiceSetup } from '@kbn/core-doc-links-server';

export type {
  AnalyticsClient,
  Event,
  EventContext,
  EventType,
  EventTypeOpts,
  IShipper,
  ContextProviderOpts,
  OptInConfig,
  ShipperClassConstructor,
  TelemetryCounter,
  TelemetryCounterType,
} from '@kbn/analytics-client';
export type {
  AnalyticsServiceSetup,
  AnalyticsServicePreboot,
  AnalyticsServiceStart,
} from '@kbn/core-analytics-server';
export type {
  RequestHandlerContext,
  CoreRequestHandlerContext,
  CustomRequestHandlerContext,
  PrebootRequestHandlerContext,
  PrebootCoreRequestHandlerContext,
} from '@kbn/core-http-request-handler-context-server';

/**
 * Context passed to the `setup` method of `preboot` plugins.
 * @public
 */
export interface CorePreboot {
  /** {@link AnalyticsServicePreboot} */
  analytics: AnalyticsServicePreboot;
  /** {@link ElasticsearchServicePreboot} */
  elasticsearch: ElasticsearchServicePreboot;
  /** {@link HttpServicePreboot} */
  http: HttpServicePreboot<RequestHandlerContext>;
  /** {@link PrebootServicePreboot} */
  preboot: PrebootServicePreboot;
}

/**
 * Context passed to the `setup` method of `standard` plugins.
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 * @public
 */
export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link AnalyticsServiceSetup} */
  analytics: AnalyticsServiceSetup;
  /** {@link CapabilitiesSetup} */
  capabilities: CapabilitiesSetup;
  /** {@link DocLinksServiceSetup} */
  docLinks: DocLinksServiceSetup;
  /** {@link ElasticsearchServiceSetup} */
  elasticsearch: ElasticsearchServiceSetup;
  /** {@link ExecutionContextSetup} */
  executionContext: ExecutionContextSetup;
  /** {@link HttpServiceSetup} */
  http: HttpServiceSetup<RequestHandlerContext> & {
    /** {@link HttpResources} */
    resources: HttpResources;
  };
  /** {@link I18nServiceSetup} */
  i18n: I18nServiceSetup;
  /** {@link LoggingServiceSetup} */
  logging: LoggingServiceSetup;
  /** {@link MetricsServiceSetup} */
  metrics: MetricsServiceSetup;
  /** {@link SavedObjectsServiceSetup} */
  savedObjects: SavedObjectsServiceSetup;
  /** {@link StatusServiceSetup} */
  status: StatusServiceSetup;
  /** {@link UiSettingsServiceSetup} */
  uiSettings: UiSettingsServiceSetup;
  /** {@link DeprecationsServiceSetup} */
  deprecations: DeprecationsServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
  /** @internal {@link CoreUsageDataSetup} */
  coreUsageData: CoreUsageDataSetup;
}

/**
 * Allows plugins to get access to APIs available in start inside async handlers.
 * Promise will not resolve until Core and plugin dependencies have completed `start`.
 * This should only be used inside handlers registered during `setup` that will only be executed
 * after `start` lifecycle.
 *
 * @public
 */
export type StartServicesAccessor<
  TPluginsStart extends object = object,
  TStart = unknown
> = () => Promise<[CoreStart, TPluginsStart, TStart]>;

/**
 * Context passed to the plugins `start` method.
 *
 * @public
 */
export interface CoreStart {
  /** {@link AnalyticsServiceStart} */
  analytics: AnalyticsServiceStart;
  /** {@link CapabilitiesStart} */
  capabilities: CapabilitiesStart;
  /** {@link DocLinksServiceStart} */
  docLinks: DocLinksServiceStart;
  /** {@link ElasticsearchServiceStart} */
  elasticsearch: ElasticsearchServiceStart;
  /** {@link ExecutionContextStart} */
  executionContext: ExecutionContextStart;
  /** {@link HttpServiceStart} */
  http: HttpServiceStart;
  /** {@link MetricsServiceStart} */
  metrics: MetricsServiceStart;
  /** {@link SavedObjectsServiceStart} */
  savedObjects: SavedObjectsServiceStart;
  /** {@link UiSettingsServiceStart} */
  uiSettings: UiSettingsServiceStart;
  /** @internal {@link CoreUsageDataStart} */
  coreUsageData: CoreUsageDataStart;
}

export type {
  CapabilitiesSetup,
  CapabilitiesStart,
  ExecutionContextSetup,
  ExecutionContextStart,
  HttpResources,
  PluginsServiceSetup,
  PluginsServiceStart,
};

/**
 * Config schemas for the platform services.
 *
 * @alpha
 */
export const config = {
  elasticsearch: {
    schema: elasticsearchConfigSchema,
  },
  logging: {
    appenders: appendersSchema as Type<AppenderConfigType>,
  },
};

/**
 * Public version of RequestHandler, default-scoped to {@link RequestHandlerContext}
 * See [@link RequestHandler}
 * @public
 */
type PublicRequestHandler<
  P = unknown,
  Q = unknown,
  B = unknown,
  Context extends RequestHandlerContext = RequestHandlerContext,
  Method extends RouteMethod = any,
  ResponseFactory extends KibanaResponseFactory = KibanaResponseFactory
> = RequestHandler<P, Q, B, Context, Method, ResponseFactory>;

export type { PublicRequestHandler as RequestHandler, RequestHandler as BaseRequestHandler };

/**
 * Public version of IRouter, default-scoped to {@link RequestHandlerContext}
 * See [@link IRouter}
 * @public
 */
type PublicRouter<ContextType extends RequestHandlerContext = RequestHandlerContext> =
  IRouter<ContextType>;

export type { PublicRouter as IRouter, IRouter as IBaseRouter };

/**
 * Public version of RequestHandlerContext, default-scoped to {@link RequestHandlerContext}
 * See [@link RequestHandlerContext}
 * @public
 */
type PublicHttpServiceSetup<ContextType extends RequestHandlerContext = RequestHandlerContext> =
  HttpServiceSetup<ContextType>;

export type {
  PublicHttpServiceSetup as HttpServiceSetup,
  HttpServiceSetup as BaseHttpServiceSetup,
};
