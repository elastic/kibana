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
 * All exports from TS source files (where the implementation is actualy done in TS).
 */
export * from './target/types/type_exports';

/**
 * All exports from TS ambient definitions (where types are added for JS source in a .d.ts file).
 */
import {
  CallClusterOptions as ESCallClusterOptions,
  Cluster as ESCluster,
  ClusterConfig as ESClusterConfig,
  ElasticsearchPlugin as ESPlugin,
} from './src/legacy/core_plugins/elasticsearch';
import {
  KibanaConfig as LegKibanaConfig,
  Request as LegRequest,
  ResponseToolkit as LegResponseToolkit,
  Server as LegServer,
} from './src/server/kbn_server';

// Workaround for re-exporting types under a namespace.
// https://github.com/Microsoft/TypeScript/issues/4336#issuecomment-309282591
// tslint:disable:no-namespace
// tslint:disable:no-empty-interface
export namespace Legacy {
  export interface KibanaConfig extends LegKibanaConfig {}
  export interface Request extends LegRequest {}
  export interface ResponseToolkit extends LegResponseToolkit {}
  export interface Server extends LegServer {}

  export namespace Plugins {
    export namespace elasticsearch {
      export interface Plugin extends ESPlugin {}
      export interface Cluster extends ESCluster {}
      export interface ClusterConfig extends ESClusterConfig {}
      export interface CallClusterOptions extends ESCallClusterOptions {}
    }
  }
}
