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

import { Observable } from 'rxjs';
import {
  ClusterClient,
  ElasticsearchClientConfig,
  ElasticsearchServiceSetup,
  ScopedClusterClient,
} from './elasticsearch';
import {
  HttpServiceSetup,
  HttpServiceStart,
  IRouter,
  RequestHandlerContextContainer,
  RequestHandlerContextProvider,
} from './http';
import { PluginsServiceSetup, PluginsServiceStart, PluginOpaqueId } from './plugins';
import { ContextSetup } from './context';

export { bootstrap } from './bootstrap';
export { ConfigPath, ConfigService } from './config';
export {
  IContextContainer,
  IContextProvider,
  HandlerFunction,
  HandlerContextType,
  HandlerParameters,
} from './context';
export { CoreId } from './core_context';
export {
  CallAPIOptions,
  ClusterClient,
  Headers,
  ScopedClusterClient,
  ElasticsearchClientConfig,
  ElasticsearchError,
  ElasticsearchErrorHelpers,
  APICaller,
  FakeRequest,
} from './elasticsearch';
export {
  AuthenticationHandler,
  AuthHeaders,
  AuthResultParams,
  AuthStatus,
  AuthToolkit,
  CustomHttpResponseOptions,
  GetAuthHeaders,
  GetAuthState,
  HttpResponseOptions,
  HttpResponsePayload,
  HttpServerSetup,
  ErrorHttpResponseOptions,
  IKibanaSocket,
  IsAuthenticated,
  KibanaRequest,
  KibanaRequestRoute,
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
  SavedObjectsBulkResponse,
  SavedObjectsClient,
  SavedObjectsClientProviderOptions,
  SavedObjectsClientWrapperFactory,
  SavedObjectsClientWrapperOptions,
  SavedObjectsCreateOptions,
  SavedObjectsErrorHelpers,
  SavedObjectsExportOptions,
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
  SavedObjectsService,
  SavedObjectsUpdateOptions,
  SavedObjectsUpdateResponse,
} from './saved_objects';

export { RecursiveReadonly } from '../utils';

export {
  SavedObject,
  SavedObjectAttribute,
  SavedObjectAttributes,
  SavedObjectReference,
  SavedObjectsBaseOptions,
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsMigrationVersion,
} from './types';

export { LegacyServiceSetupDeps, LegacyServiceStartDeps } from './legacy';

/**
 * Plugin specific context passed to a route handler.
 * @public
 */
export interface RequestHandlerContext {
  core: {
    elasticsearch: {
      dataClient: ScopedClusterClient;
      adminClient: ScopedClusterClient;
    };
  };
}

/**
 * Context passed to the plugins `setup` method.
 *
 * @public
 */
export interface CoreSetup {
  context: {
    createContextContainer: ContextSetup['createContextContainer'];
  };
  elasticsearch: {
    adminClient$: Observable<ClusterClient>;
    dataClient$: Observable<ClusterClient>;
    createClient: (
      type: string,
      clientConfig?: Partial<ElasticsearchClientConfig>
    ) => ClusterClient;
  };
  http: {
    createCookieSessionStorageFactory: HttpServiceSetup['createCookieSessionStorageFactory'];
    registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
    registerAuth: HttpServiceSetup['registerAuth'];
    registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
    basePath: HttpServiceSetup['basePath'];
    isTlsEnabled: HttpServiceSetup['isTlsEnabled'];
    registerRouteHandlerContext: <T extends keyof RequestHandlerContext>(
      name: T,
      provider: RequestHandlerContextProvider<T>
    ) => RequestHandlerContextContainer;
    createRouter: () => IRouter;
  };
}

/**
 * Context passed to the plugins `start` method.
 *
 * @public
 */
export interface CoreStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

/** @internal */
export interface InternalCoreSetup {
  context: ContextSetup;
  http: HttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
}

/**
 * @public
 */
export interface InternalCoreStart {} // eslint-disable-line @typescript-eslint/no-empty-interface

export {
  ContextSetup,
  HttpServiceSetup,
  HttpServiceStart,
  ElasticsearchServiceSetup,
  PluginsServiceSetup,
  PluginsServiceStart,
  PluginOpaqueId,
};
