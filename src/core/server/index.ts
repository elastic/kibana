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
import { ClusterClient, ElasticsearchServiceSetup } from './elasticsearch';
import { HttpServiceSetup, HttpServiceStart } from './http';
import { PluginsServiceSetup, PluginsServiceStart } from './plugins';

export { bootstrap } from './bootstrap';
export { ConfigService } from './config';
export {
  CallAPIOptions,
  ClusterClient,
  Headers,
  ScopedClusterClient,
  ElasticsearchClientConfig,
  APICaller,
} from './elasticsearch';
export {
  AuthenticationHandler,
  AuthToolkit,
  KibanaRequest,
  KibanaRequestRoute,
  OnPreAuthHandler,
  OnPreAuthToolkit,
  OnPostAuthHandler,
  OnPostAuthToolkit,
  Router,
  RouteMethod,
  RouteConfigOptions,
  SessionStorageFactory,
  SessionStorage,
} from './http';
export { Logger, LoggerFactory, LogMeta, LogRecord, LogLevel } from './logging';

export {
  DiscoveredPlugin,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginName,
} from './plugins';

export { RecursiveReadonly } from '../utils';

/**
 * Context passed to the plugins `setup` method.
 *
 * @public
 */
export interface CoreSetup {
  elasticsearch: {
    adminClient$: Observable<ClusterClient>;
    dataClient$: Observable<ClusterClient>;
  };
  http: {
    registerOnPreAuth: HttpServiceSetup['registerOnPreAuth'];
    registerAuth: HttpServiceSetup['registerAuth'];
    registerOnPostAuth: HttpServiceSetup['registerOnPostAuth'];
    basePath: HttpServiceSetup['basePath'];
    createNewServer: HttpServiceSetup['createNewServer'];
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
  http: HttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
  plugins: PluginsServiceSetup;
}

/**
 * @public
 */
export interface InternalCoreStart {
  http: HttpServiceStart;
  plugins: PluginsServiceStart;
}

export {
  HttpServiceSetup,
  HttpServiceStart,
  ElasticsearchServiceSetup,
  PluginsServiceSetup,
  PluginsServiceStart,
};
