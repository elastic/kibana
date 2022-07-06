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

import { AwaitedProperties } from '@kbn/utility-types';
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
import {
  ElasticsearchServiceSetup,
  configSchema as elasticsearchConfigSchema,
  ElasticsearchServiceStart,
  ElasticsearchServicePreboot,
} from './elasticsearch';
import type {
  HttpServicePreboot,
  HttpServiceSetup,
  HttpServiceStart,
  IRouter,
  RequestHandler,
} from './http';
import { HttpResources } from './http_resources';

import { PluginsServiceSetup, PluginsServiceStart, PluginOpaqueId } from './plugins';
import { UiSettingsServiceSetup, UiSettingsServiceStart } from './ui_settings';
import { SavedObjectsServiceSetup, SavedObjectsServiceStart } from './saved_objects';
import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { MetricsServiceSetup, MetricsServiceStart } from './metrics';
import { StatusServiceSetup } from './status';
import { CoreUsageDataStart, CoreUsageDataSetup } from './core_usage_data';
import { I18nServiceSetup } from './i18n';
import { DeprecationsServiceSetup } from './deprecations';
// Because of #79265 we need to explicitly import, then export these types for
// scripts/telemetry_check.js to work as expected
import {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  ConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
} from './core_usage_data';
import { PrebootServicePreboot } from './preboot';
import type { CoreRequestHandlerContext } from './core_route_handler_context';
import type { PrebootCoreRequestHandlerContext } from './preboot_core_route_handler_context';
import { KibanaResponseFactory, RouteMethod } from './http';

export type { PrebootServicePreboot } from './preboot';

export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
};

export type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
export type { IExecutionContextContainer } from '@kbn/core-execution-context-server';

export { bootstrap } from './bootstrap';
export type {
  Capabilities,
  CapabilitiesProvider,
  CapabilitiesSwitcher,
  ResolveCapabilitiesOptions,
} from './capabilities';
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
export type {
  IContextContainer,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';
export type { CoreId } from '@kbn/core-base-common-internal';

export { ElasticsearchConfig, pollEsNodesVersion } from './elasticsearch';
export type {
  ElasticsearchServicePreboot,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  NodesVersionCompatibility,
  FakeRequest,
  ScopeableRequest,
  ElasticsearchClient,
  IClusterClient,
  ICustomClusterClient,
  ElasticsearchClientConfig,
  IScopedClusterClient,
  SearchResponse,
  CountResponse,
  ShardsInfo,
  ShardsResponse,
  GetResponse,
  DeleteDocumentResponse,
  ElasticsearchConfigPreboot,
  PollEsNodesVersionOptions,
  UnauthorizedErrorHandlerOptions,
  UnauthorizedErrorHandlerResultRetryParams,
  UnauthorizedErrorHandlerRetryResult,
  UnauthorizedErrorHandlerNotHandledResult,
  UnauthorizedErrorHandlerResult,
  UnauthorizedErrorHandlerToolkit,
  UnauthorizedErrorHandler,
  ElasticsearchRequestHandlerContext,
} from './elasticsearch';

export type {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthStatus,
  AuthToolkit,
  AuthRedirected,
  AuthRedirectedParams,
  AuthResult,
  AuthResultType,
  Authenticated,
  AuthNotHandled,
  BasePath,
  IBasePath,
  CustomHttpResponseOptions,
  GetAuthHeaders,
  GetAuthState,
  Headers,
  HttpAuth,
  HttpResponseOptions,
  HttpResponsePayload,
  HttpServerInfo,
  HttpServicePreboot,
  HttpServiceStart,
  ErrorHttpResponseOptions,
  IKibanaSocket,
  IsAuthenticated,
  KibanaRequestEvents,
  KibanaRequestRoute,
  KibanaRequestRouteOptions,
  IKibanaResponse,
  LifecycleResponseFactory,
  KnownHeaders,
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
  RedirectResponseOptions,
  RequestHandlerWrapper,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
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
  SessionStorage,
  SessionStorageCookieOptions,
  SessionCookieValidationResult,
  SessionStorageFactory,
  DestructiveRouteMethod,
  SafeRouteMethod,
  KibanaRequest,
  ICspConfig,
  IExternalUrlConfig,
} from './http';

export { kibanaResponseFactory, validBodyOutput, CoreKibanaRequest, CspConfig } from './http';

export type {
  HttpResourcesRenderOptions,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
  HttpResourcesRequestHandler,
} from './http_resources';

export type { IRenderOptions } from './rendering';
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

export {
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  SavedObjectsUtils,
  mergeSavedObjectMigrationMaps,
} from './saved_objects';

export type {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectsClosePointInTimeOptions,
  SavedObjectsClosePointInTimeResponse,
  ISavedObjectsPointInTimeFinder,
  SavedObjectsCreatePointInTimeFinderDependencies,
  SavedObjectsCreatePointInTimeFinderOptions,
  SavedObjectsCreateOptions,
  SavedObjectTypeExcludeFromUpgradeFilterHook,
  SavedObjectsExportResultDetails,
  SavedObjectsExportExcludedObject,
  SavedObjectsFindResult,
  SavedObjectsFindResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportFailure,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
  SavedObjectsOpenPointInTimeOptions,
  SavedObjectsOpenPointInTimeResponse,
  SavedObjectsRawDoc,
  SavedObjectsRawDocParseOptions,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
  SavedObjectsRepositoryFactory,
  SavedObjectsResolveImportErrorsOptions,
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
  SavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  SavedObjectStatusMeta,
  SavedObjectsDeleteOptions,
  ISavedObjectsRepository,
  SavedObjectsRepository,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsIncrementCounterField,
  SavedObjectsFieldMapping,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsMappingProperties,
  ISavedObjectTypeRegistry,
  SavedObjectsNamespaceType,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  SavedObjectsExporter,
  ISavedObjectsExporter,
  SavedObjectExportBaseOptions,
  SavedObjectsExportByObjectOptions,
  SavedObjectsExportByTypeOptions,
  SavedObjectsExportError,
  SavedObjectsExportTransform,
  SavedObjectsExportTransformContext,
  SavedObjectsImporter,
  ISavedObjectsImporter,
  SavedObjectsImportError,
  SavedObjectsImportHook,
  SavedObjectsImportHookResult,
  SavedObjectsImportSimpleWarning,
  SavedObjectsImportActionRequiredWarning,
  SavedObjectsImportWarning,
  SavedObjectsValidationMap,
  SavedObjectsValidationSpec,
  SavedObjectsRequestHandlerContext,
} from './saved_objects';

export type {
  IUiSettingsClient,
  UiSettingsParams,
  PublicUiSettingsParams,
  UiSettingsType,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
  UserProvidedValues,
  DeprecationSettings,
  UiSettingsRequestHandlerContext,
} from './ui_settings';

export type {
  OpsMetrics,
  OpsOsMetrics,
  OpsServerMetrics,
  OpsProcessMetrics,
  MetricsServiceSetup,
  MetricsServiceStart,
  IntervalHistogram,
} from './metrics';
export { EventLoopDelaysMonitor } from './metrics';

export type { I18nServiceSetup } from './i18n';
export type {
  BaseDeprecationDetails,
  DeprecationsDetails,
  ConfigDeprecationDetails,
  FeatureDeprecationDetails,
  RegisterDeprecationsConfig,
  GetDeprecationsContext,
  DeprecationsServiceSetup,
  DeprecationsClient,
  DeprecationsRequestHandlerContext,
} from './deprecations';

export type { AppCategory } from '../types';
export { DEFAULT_APP_CATEGORIES, APP_WRAPPER_CLASS } from '../utils';

export type {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindOptionsReference,
  SavedObjectsPitParams,
  SavedObjectsMigrationVersion,
} from './types';

export { ServiceStatusLevels } from './status';
export type { CoreStatus, ServiceStatus, ServiceStatusLevel, StatusServiceSetup } from './status';

export type {
  CoreUsageDataSetup,
  CoreUsageDataStart,
  CoreUsageCounter,
  CoreIncrementUsageCounter,
  CoreIncrementCounterParams,
} from './core_usage_data';

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

export type { CoreRequestHandlerContext } from './core_route_handler_context';

/**
 * Base, abstract type for request handler contexts.
 * @public
 **/
export interface RequestHandlerContextBase {
  /**
   * Await all the specified context parts and return them.
   *
   * @example
   * ```ts
   * const resolved = await context.resolve(['core', 'pluginA']);
   * const esClient = resolved.core.elasticsearch.client;
   * const pluginAService = resolved.pluginA.someService;
   * ```
   */
  resolve: <T extends keyof Omit<this, 'resolve'>>(
    parts: T[]
  ) => Promise<AwaitedProperties<Pick<this, T>>>;
}

/**
 * Base context passed to a route handler, containing the `core` context part.
 *
 * @public
 */
export interface RequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<CoreRequestHandlerContext>;
}

/**
 * @internal
 */
export interface PrebootRequestHandlerContext extends RequestHandlerContextBase {
  core: Promise<PrebootCoreRequestHandlerContext>;
}

/**
 * Mixin allowing plugins to define their own request handler contexts.
 *
 * @public
 */
export type CustomRequestHandlerContext<T> = RequestHandlerContext & {
  [Key in keyof T]: T[Key] extends Promise<unknown> ? T[Key] : Promise<T[Key]>;
};

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
  PluginOpaqueId,
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
