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

export class Cluster {
  public callWithRequest: CallClusterWithRequest;
  public constructor(config: ClusterConfig);
}

export interface ClusterConfig {
  [option: string]: any;
}

export interface Request {
  headers: RequestHeaders;
}

interface RequestHeaders {
  [name: string]: string;
}

interface ElasticsearchClientLogging {
  error(err: Error): void;
  warning(message: string): void;
  trace(method: string, options: { path: string }, query?: string, statusCode?: number): void;
  info(): void;
  debug(): void;
  close(): void;
}

interface AssistantAPIClientParams {
  path: '/_xpack/migration/assistance';
  method: 'GET';
}

type MIGRATION_ASSISTANCE_INDEX_ACTION = 'upgrade' | 'reindex';
type MIGRATION_DEPRECATION_LEVEL = 'none' | 'info' | 'warning' | 'critical';

export interface AssistanceAPIResponse {
  indices: {
    [indexName: string]: {
      action_required: MIGRATION_ASSISTANCE_INDEX_ACTION;
    };
  };
}

interface DeprecationAPIClientParams {
  path: '/_xpack/migration/deprecations';
  method: 'GET';
}

export interface DeprecationInfo {
  level: MIGRATION_DEPRECATION_LEVEL;
  message: string;
  url: string;
  details?: string;
}

export interface DeprecationAPIResponse {
  cluster_settings: DeprecationInfo[];
  node_settings: DeprecationInfo[];
  index_settings: {
    [indexName: string]: DeprecationInfo[];
  };
}

export interface CallClusterWithRequest {
  <T = any>(request: Request, endpoint: string, clientParams?: object, options?: object): Promise<
    T
  >;
  (
    request: Request,
    endpoint: 'transport.request',
    clientParams: AssistantAPIClientParams,
    options?: {}
  ): Promise<AssistanceAPIResponse>;
  (
    request: Request,
    endpoint: 'transport.request',
    clientParams: DeprecationAPIClientParams,
    options?: {}
  ): Promise<DeprecationAPIResponse>;
}

export interface ElasticsearchPlugin {
  ElasticsearchClientLogging: ElasticsearchClientLogging;
  getCluster(name: string): Cluster;
  createCluster(name: string, config: ClusterConfig): Cluster;
  filterHeaders(originalHeaders: RequestHeaders, headersToKeep: string[]): void;
  waitUntilReady(): Promise<void>;
}
