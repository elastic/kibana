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
import {
  ElasticsearchServiceSetup,
  ILegacyScopedClusterClient,
  configSchema as elasticsearchConfigSchema,
  ElasticsearchServiceStart,
  IScopedClusterClient,
} from './elasticsearch';
import { HttpServiceSetup, HttpServiceStart } from './http';
import { HttpResources } from './http_resources';

import { PluginsServiceSetup, PluginsServiceStart, PluginOpaqueId } from './plugins';
import { ContextSetup } from './context';
import { IUiSettingsClient, UiSettingsServiceSetup, UiSettingsServiceStart } from './ui_settings';
import { SavedObjectsClientContract } from './saved_objects/types';
import {
  ISavedObjectTypeRegistry,
  SavedObjectsServiceSetup,
  SavedObjectsServiceStart,
  ISavedObjectsExporter,
  ISavedObjectsImporter,
  SavedObjectsClientProviderOptions,
} from './saved_objects';
import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { MetricsServiceSetup, MetricsServiceStart } from './metrics';
import { StatusServiceSetup } from './status';
import { AppenderConfigType, appendersSchema, LoggingServiceSetup } from './logging';
import { CoreUsageDataStart } from './core_usage_data';
import { I18nServiceSetup } from './i18n';
import { DeprecationsServiceSetup } from './deprecations';
// Because of #79265 we need to explicity import, then export these types for
// scripts/telemetry_check.js to work as expected
import {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  ConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
} from './core_usage_data';

export type {
  CoreUsageStats,
  CoreUsageData,
  CoreConfigUsageData,
  CoreEnvironmentUsageData,
  CoreServicesUsageData,
  ConfigUsageData,
};

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
  ConfigDeprecationProvider,
  ConfigDeprecationFactory,
  AddConfigDeprecation,
  EnvironmentMode,
  PackageInfo,
} from './config';
export type {
  IContextContainer,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';
export type { CoreId } from './core_context';

export { CspConfig } from './csp';
export type { ICspConfig } from './csp';

export { ElasticsearchConfig } from './elasticsearch';
export type {
  LegacyClusterClient,
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
  LegacyScopedClusterClient,
  ILegacyScopedClusterClient,
  LegacyElasticsearchClientConfig,
  LegacyElasticsearchError,
  LegacyElasticsearchErrorHelpers,
  ElasticsearchServiceSetup,
  ElasticsearchServiceStart,
  ElasticsearchStatusMeta,
  NodesVersionCompatibility,
  LegacyAPICaller,
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
} from './elasticsearch';

export type {
  LegacyCallAPIOptions,
  AssistantAPIClientParams,
  MIGRATION_ASSISTANCE_INDEX_ACTION,
  MIGRATION_DEPRECATION_LEVEL,
  AssistanceAPIResponse,
  DeprecationAPIClientParams,
  DeprecationInfo,
  IndexSettingsDeprecationInfo,
  DeprecationAPIResponse,
} from './elasticsearch/legacy/api_types';
export type { IExternalUrlConfig, IExternalUrlPolicy } from './external_url';
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
  HttpServiceSetup,
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
  LegacyRequest,
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
  RequestHandler,
  RequestHandlerWrapper,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  KibanaResponseFactory,
  RouteConfig,
  IRouter,
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
} from './http';

export { KibanaRequest, kibanaResponseFactory, validBodyOutput } from './http';

export type {
  HttpResourcesRenderOptions,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
  HttpResourcesRequestHandler,
} from './http_resources';

export type { IRenderOptions } from './rendering';
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
  LoggingServiceSetup,
  LoggerContextConfigInput,
  LoggerConfigType,
  AppenderConfigType,
} from './logging';

export type {
  DiscoveredPlugin,
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
} from './plugins';

export {
  SavedObjectsClient,
  SavedObjectsErrorHelpers,
  SavedObjectsSerializer,
  SavedObjectTypeRegistry,
  SavedObjectsUtils,
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
  SavedObjectsExportResultDetails,
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
} from './ui_settings';

export type {
  OpsMetrics,
  OpsOsMetrics,
  OpsServerMetrics,
  OpsProcessMetrics,
  MetricsServiceSetup,
  MetricsServiceStart,
} from './metrics';

export type { I18nServiceSetup } from './i18n';
export type {
  DeprecationsDetails,
  RegisterDeprecationsConfig,
  GetDeprecationsContext,
  DeprecationsServiceSetup,
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

export type { CoreUsageDataStart } from './core_usage_data';

/**
 * Plugin specific context passed to a route handler.
 *
 * Provides the following clients and services:
 *    - {@link SavedObjectsClient | savedObjects.client} - Saved Objects client
 *      which uses the credentials of the incoming request
 *    - {@link ISavedObjectTypeRegistry | savedObjects.typeRegistry} - Type registry containing
 *      all the registered types.
 *    - {@link IScopedClusterClient | elasticsearch.client} - Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link LegacyScopedClusterClient | elasticsearch.legacy.client} - The legacy Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link IUiSettingsClient | uiSettings.client} - uiSettings client
 *      which uses the credentials of the incoming request
 *
 * @public
 */
export interface RequestHandlerContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
      getClient: (options?: SavedObjectsClientProviderOptions) => SavedObjectsClientContract;
      getExporter: (client: SavedObjectsClientContract) => ISavedObjectsExporter;
      getImporter: (client: SavedObjectsClientContract) => ISavedObjectsImporter;
    };
    elasticsearch: {
      client: IScopedClusterClient;
      legacy: {
        /*
         * @deprecated Use {@link IScopedClusterClient}.
         */
        client: ILegacyScopedClusterClient;
      };
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
  };
}

/**
 * Context passed to the plugins `setup` method.
 *
 * @typeParam TPluginsStart - the type of the consuming plugin's start dependencies. Should be the same
 *                            as the consuming {@link Plugin}'s `TPluginsStart` type. Used by `getStartServices`.
 * @typeParam TStart - the type of the consuming plugin's start contract. Should be the same as the
 *                     consuming {@link Plugin}'s `TStart` type. Used by `getStartServices`.
 * @public
 */
export interface CoreSetup<TPluginsStart extends object = object, TStart = unknown> {
  /** {@link CapabilitiesSetup} */
  capabilities: CapabilitiesSetup;
  /** {@link ContextSetup} */
  context: ContextSetup;
  /** {@link ElasticsearchServiceSetup} */
  elasticsearch: ElasticsearchServiceSetup;
  /** {@link HttpServiceSetup} */
  http: HttpServiceSetup & {
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
  /** {@link CapabilitiesStart} */
  capabilities: CapabilitiesStart;
  /** {@link ElasticsearchServiceStart} */
  elasticsearch: ElasticsearchServiceStart;
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
  ContextSetup,
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
