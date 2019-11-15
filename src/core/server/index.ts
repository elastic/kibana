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

import { ElasticsearchServiceSetup, IScopedClusterClient } from './elasticsearch';
import { HttpServiceSetup } from './http';
import { PluginsServiceSetup, PluginsServiceStart, PluginOpaqueId } from './plugins';
import { ContextSetup } from './context';
import { IUiSettingsClient, UiSettingsServiceSetup } from './ui_settings';
import { SavedObjectsClientContract } from './saved_objects/types';

export { bootstrap } from './bootstrap';
export { ConfigPath, ConfigService, EnvironmentMode, PackageInfo } from './config';
export {
  IContextContainer,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';
export { CoreId } from './core_context';
export {
  ClusterClient,
  IClusterClient,
  Headers,
  ScopedClusterClient,
  IScopedClusterClient,
  ElasticsearchClientConfig,
  ElasticsearchError,
  ElasticsearchErrorHelpers,
  ElasticsearchServiceSetup,
  APICaller,
  FakeRequest,
} from './elasticsearch';
export * from './elasticsearch/api_types';
export {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthStatus,
  AuthToolkit,
  AuthResult,
  AuthResultType,
  Authenticated,
  BasePath,
  IBasePath,
  CustomHttpResponseOptions,
  GetAuthHeaders,
  GetAuthState,
  HttpResponseOptions,
  HttpResponsePayload,
  HttpServiceSetup,
  HttpServiceStart,
  ErrorHttpResponseOptions,
  IKibanaSocket,
  IsAuthenticated,
  KibanaRequest,
  KibanaRequestRoute,
  IKibanaResponse,
  LifecycleResponseFactory,
  KnownHeaders,
  LegacyRequest,
  OnPreAuthHandler,
  OnPreAuthToolkit,
  OnPostAuthHandler,
  OnPostAuthToolkit,
  RedirectResponseOptions,
  RequestHandler,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
  ResponseError,
  ResponseErrorAttributes,
  ResponseHeaders,
  kibanaResponseFactory,
  KibanaResponseFactory,
  RouteConfig,
  IRouter,
  RouteMethod,
  RouteConfigOptions,
  SessionStorage,
  SessionStorageCookieOptions,
  SessionStorageFactory,
} from './http';
export { Logger, LoggerFactory, LogMeta, LogRecord, LogLevel } from './logging';

export {
  DiscoveredPlugin,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginManifest,
  PluginName,
} from './plugins';

export {
  SavedObjectsBulkCreateObject,
  SavedObjectsBulkGetObject,
  SavedObjectsBulkUpdateObject,
  SavedObjectsBulkUpdateOptions,
  SavedObjectsBulkResponse,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsClient,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsCreateOptions,
  SavedObjectsErrorHelpers,
  SavedObjectsExportOptions,
  SavedObjectsExportResultDetails,
  SavedObjectsFindResponse,
  SavedObjectsImportConflictError,
  SavedObjectsImportError,
  SavedObjectsImportMissingReferencesError,
  SavedObjectsImportOptions,
  SavedObjectsImportResponse,
  SavedObjectsImportRetry,
  SavedObjectsImportUnknownError,
  SavedObjectsImportUnsupportedTypeError,
  SavedObjectsMigrationLogger,
  SavedObjectsRawDoc,
  SavedObjectsResolveImportErrorsOptions,
  SavedObjectsSchema,
  SavedObjectsSerializer,
  SavedObjectsLegacyService,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
  SavedObjectsDeleteOptions,
} from './saved_objects';

export {
  IUiSettingsClient,
  UiSettingsParams,
  UiSettingsType,
  UiSettingsServiceSetup,
  UserProvidedValues,
} from './ui_settings';

export { RecursiveReadonly } from '../utils';

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

export { LegacyServiceSetupDeps, LegacyServiceStartDeps } from './legacy';

/**
 * Plugin specific context passed to a route handler.
 *
 * Provides the following clients:
 *    - {@link SavedObjectsClient | savedObjects.client} - Saved Objects client
 *      which uses the credentials of the incoming request
 *    - {@link ScopedClusterClient | elasticsearch.dataClient} - Elasticsearch
 *      data client which uses the credentials of the incoming request
 *    - {@link ScopedClusterClient | elasticsearch.adminClient} - Elasticsearch
 *      admin client which uses the credentials of the incoming request
 *
 * @public
 */
export interface RequestHandlerContext {
  core: {
    savedObjects: {
      client: SavedObjectsClientContract;
    };
    elasticsearch: {
      dataClient: IScopedClusterClient;
      adminClient: IScopedClusterClient;
    };
    uiSettings: {
      client: IUiSettingsClient;
    };
  };
}

/**
 * Context passed to the plugins `setup` method.
 *
 * @public
 */
export interface CoreSetup {
  /** {@link ContextSetup} */
  context: ContextSetup;
  /** {@link ElasticsearchServiceSetup} */
  elasticsearch: ElasticsearchServiceSetup;
  /** {@link HttpServiceSetup} */
  http: HttpServiceSetup;
  /** {@link UiSettingsServiceSetup} */
  uiSettings: UiSettingsServiceSetup;
}

/**
 * Context passed to the plugins `start` method.
 *
 * @public
 */
export interface CoreStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

export { ContextSetup, PluginsServiceSetup, PluginsServiceStart, PluginOpaqueId };
