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
} from './saved_objects';
import { CapabilitiesSetup, CapabilitiesStart } from './capabilities';
import { MetricsServiceStart } from './metrics';
import { StatusServiceSetup } from './status';
import { Auditor, AuditTrailSetup, AuditTrailStart } from './audit_trail';
import {
  LoggingServiceSetup,
  appendersSchema,
  loggerContextConfigSchema,
  loggerSchema,
} from './logging';

export { AuditableEvent, Auditor, AuditorFactory, AuditTrailSetup } from './audit_trail';
export { bootstrap } from './bootstrap';
export { Capabilities, CapabilitiesProvider, CapabilitiesSwitcher } from './capabilities';
export {
  ConfigPath,
  ConfigService,
  ConfigDeprecation,
  ConfigDeprecationProvider,
  ConfigDeprecationLogger,
  ConfigDeprecationFactory,
  EnvironmentMode,
  PackageInfo,
} from './config';
export {
  IContextContainer,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';
export { CoreId } from './core_context';
export { CspConfig, ICspConfig } from './csp';
export {
  LegacyClusterClient,
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
  LegacyScopedClusterClient,
  ILegacyScopedClusterClient,
  ElasticsearchConfig,
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
  Explanation,
  GetResponse,
  DeleteDocumentResponse,
} from './elasticsearch';
export * from './elasticsearch/legacy/api_types';
export {
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
  KibanaRequest,
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
  kibanaResponseFactory,
  KibanaResponseFactory,
  RouteConfig,
  IRouter,
  RouteRegistrar,
  RouteMethod,
  RouteConfigOptions,
  RouteConfigOptionsBody,
  RouteContentType,
  validBodyOutput,
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

export {
  HttpResourcesRenderOptions,
  HttpResourcesResponseOptions,
  HttpResourcesServiceToolkit,
  HttpResourcesRequestHandler,
} from './http_resources';

export { IRenderOptions } from './rendering';
export {
  Logger,
  LoggerFactory,
  LogMeta,
  LogRecord,
  LogLevel,
  LoggingServiceSetup,
  LoggerContextConfigInput,
  LoggerConfigType,
  AppenderConfigType,
} from './logging';

export {
  DiscoveredPlugin,
  Plugin,
  PluginConfigDescriptor,
  PluginConfigSchema,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PluginName,
  SharedGlobalConfig,
} from './plugins';

export {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsCheckConflictsObject,
  SavedObjectsCheckConflictsResponse,
  SavedObjectsClient,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsClientFactory,
  SavedObjectsClientFactoryProvider,
  SavedObjectsCreateOptions,
  SavedObjectsErrorHelpers,
  SavedObjectsExportOptions,
  SavedObjectsExportResultDetails,
  SavedObjectsFindResult,
  SavedObjectsFindResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportAmbiguousConflictError,
  SavedObjectsImportError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportSuccess,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectMigrationContext,
  SavedObjectsMigrationLogger,
  SavedObjectsRawDoc,
  SavedObjectSanitizedDoc,
  SavedObjectUnsanitizedDoc,
  SavedObjectsRepositoryFactory,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsSchema,
  SavedObjectsSerializer,
  SavedObjectsLegacyService,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsAddToNamespacesOptions,
  SavedObjectsAddToNamespacesResponse,
  SavedObjectsDeleteFromNamespacesOptions,
  SavedObjectsDeleteFromNamespacesResponse,
  SavedObjectsServiceStart,
  SavedObjectsServiceSetup,
  SavedObjectStatusMeta,
  SavedObjectsDeleteOptions,
  ISavedObjectsRepository,
  SavedObjectsRepository,
  SavedObjectsDeleteByNamespaceOptions,
  SavedObjectsIncrementCounterOptions,
  SavedObjectsComplexFieldMapping,
  SavedObjectsCoreFieldMapping,
  SavedObjectsFieldMapping,
  SavedObjectsTypeMappingDefinition,
  SavedObjectsMappingProperties,
  SavedObjectTypeRegistry,
  ISavedObjectTypeRegistry,
  SavedObjectsNamespaceType,
  SavedObjectsType,
  SavedObjectsTypeManagementDefinition,
  SavedObjectMigrationMap,
  SavedObjectMigrationFn,
  exportSavedObjectsToStream,
  importSavedObjectsFromStream,
  resolveSavedObjectsImportErrors,
} from './saved_objects';

export {
  IUiSettingsClient,
  UiSettingsParams,
  PublicUiSettingsParams,
  UiSettingsType,
  UiSettingsServiceSetup,
  UiSettingsServiceStart,
  UserProvidedValues,
  ImageValidation,
  DeprecationSettings,
  StringValidation,
  StringValidationRegex,
  StringValidationRegexString,
} from './ui_settings';

export {
  OpsMetrics,
  OpsOsMetrics,
  OpsServerMetrics,
  OpsProcessMetrics,
  MetricsServiceSetup,
} from './metrics';

export {
  DEFAULT_APP_CATEGORIES,
  getFlattenedObject,
  URLMeaningfulParts,
  modifyUrl,
  isRelativeUrl,
  Freezable,
  deepFreeze,
  assertNever,
} from '../utils';

export {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectAttributeSingle,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  MutatingOperationRefreshSetting,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
} from './types';

export {
  LegacyServiceSetupDeps,
  LegacyServiceStartDeps,
  LegacyServiceDiscoverPlugins,
  LegacyConfig,
  LegacyUiExports,
  LegacyInternals,
} from './legacy';

export {
  CoreStatus,
  ServiceStatus,
  ServiceStatusLevel,
  ServiceStatusLevels,
  StatusServiceSetup,
} from './status';

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
 *    - {@link Auditor | uiSettings.auditor} - AuditTrail client scoped to the incoming request
 *
 * @public
 */
export interface RequestHandlerContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
      typeRegistry: ISavedObjectTypeRegistry;
    };
    elasticsearch: {
      client: IScopedClusterClient;
      legacy: {
        client: ILegacyScopedClusterClient;
      };
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
    auditor: Auditor;
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
  /** {@link LoggingServiceSetup} */
  logging: LoggingServiceSetup;
  /** {@link SavedObjectsServiceSetup} */
  savedObjects: SavedObjectsServiceSetup;
  /** {@link StatusServiceSetup} */
  status: StatusServiceSetup;
  /** {@link UiSettingsServiceSetup} */
  uiSettings: UiSettingsServiceSetup;
  /** {@link StartServicesAccessor} */
  getStartServices: StartServicesAccessor<TPluginsStart, TStart>;
  /** {@link AuditTrailSetup} */
  auditTrail: AuditTrailSetup;
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
  /** {@link AuditTrailSetup} */
  auditTrail: AuditTrailStart;
}

export {
  CapabilitiesSetup,
  CapabilitiesStart,
  ContextSetup,
  HttpResources,
  PluginsServiceSetup,
  PluginsServiceStart,
  PluginOpaqueId,
  AuditTrailStart,
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
    appenders: appendersSchema,
    loggers: loggerSchema,
    loggerContext: loggerContextConfigSchema,
  },
};
