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
import { ElasticsearchServiceSetup } from './elasticsearch';
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
  OnRequestHandler,
  OnRequestToolkit,
  Router,
} from './http';
export { Logger, LoggerFactory, LogMeta, LogRecord, LogLevel } from './logging';

export {
  DiscoveredPlugin,
  Plugin,
  PluginInitializer,
  PluginInitializerContext,
  PluginName,
  PluginSetupContext,
  PluginStartContext,
} from './plugins';

/** @public */
export interface CoreSetup {
  http: HttpServiceSetup;
  elasticsearch: ElasticsearchServiceSetup;
  plugins: PluginsServiceSetup;
}

/**
 * @public
 */
export interface CoreStart {
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
