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

import { Observable } from 'rxjs';
import { Headers } from '../http/router';
import { LegacyRequest, KibanaRequest } from '../http';
import { ElasticsearchConfig } from './elasticsearch_config';
import {
  LegacyElasticsearchClientConfig,
  ILegacyClusterClient,
  ILegacyCustomClusterClient,
} from './legacy';
import { IClusterClient, ICustomClusterClient, ElasticsearchClientConfig } from './client';
import { NodesVersionCompatibility } from './version_check/ensure_es_version';
import { ServiceStatus } from '../status';

/**
 * @public
 */
export interface ElasticsearchServiceSetup {
  /**
   * @deprecated
   * Use {@link ElasticsearchServiceStart.legacy} instead.
   *
   * */
  legacy: {
    /**
     * @deprecated
     * Use {@link ElasticsearchServiceStart.legacy | ElasticsearchServiceStart.legacy.createClient} instead.
     *
     * Create application specific Elasticsearch cluster API client with customized config. See {@link ILegacyClusterClient}.
     *
     * @param type Unique identifier of the client
     * @param clientConfig A config consists of Elasticsearch JS client options and
     * valid sub-set of Elasticsearch service config.
     * We fill all the missing properties in the `clientConfig` using the default
     * Elasticsearch config so that we don't depend on default values set and
     * controlled by underlying Elasticsearch JS client.
     * We don't run validation against the passed config and expect it to be valid.
     *
     * @example
     * ```js
     * const client = elasticsearch.createCluster('my-app-name', config);
     * const data = await client.callAsInternalUser();
     * ```
     */
    readonly createClient: (
      type: string,
      clientConfig?: Partial<LegacyElasticsearchClientConfig>
    ) => ILegacyCustomClusterClient;

    /**
     * @deprecated
     * Use {@link ElasticsearchServiceStart.legacy | ElasticsearchServiceStart.legacy.client} instead.
     *
     * All Elasticsearch config value changes are processed under the hood.
     * See {@link ILegacyClusterClient}.
     *
     * @example
     * ```js
     * const client = core.elasticsearch.legacy.client;
     * ```
     */
    readonly client: ILegacyClusterClient;
  };
}

/** @internal */
export interface InternalElasticsearchServiceSetup {
  // Required for the BWC with the legacy Kibana only.
  readonly legacy: ElasticsearchServiceSetup['legacy'] & {
    readonly config$: Observable<ElasticsearchConfig>;
  };
  esNodesCompatibility$: Observable<NodesVersionCompatibility>;
  status$: Observable<ServiceStatus<ElasticsearchStatusMeta>>;
}

/**
 * @public
 */
export interface ElasticsearchServiceStart {
  /**
   * @deprecated
   * Provided for the backward compatibility.
   * Switch to the new elasticsearch client as soon as https://github.com/elastic/kibana/issues/35508 done.
   * */
  legacy: {
    /**
     * Create application specific Elasticsearch cluster API client with customized config. See {@link ILegacyClusterClient}.
     *
     * @param type Unique identifier of the client
     * @param clientConfig A config consists of Elasticsearch JS client options and
     * valid sub-set of Elasticsearch service config.
     * We fill all the missing properties in the `clientConfig` using the default
     * Elasticsearch config so that we don't depend on default values set and
     * controlled by underlying Elasticsearch JS client.
     * We don't run validation against the passed config and expect it to be valid.
     *
     * @example
     * ```js
     * const client = elasticsearch.legacy.createClient('my-app-name', config);
     * const data = await client.callAsInternalUser();
     * ```
     */
    readonly createClient: (
      type: string,
      clientConfig?: Partial<LegacyElasticsearchClientConfig>
    ) => ILegacyCustomClusterClient;

    /**
     * A pre-configured {@link ILegacyClusterClient | legacy Elasticsearch client}.
     *
     * @example
     * ```js
     * const client = core.elasticsearch.legacy.client;
     * ```
     */
    readonly client: ILegacyClusterClient;
  };
}

/**
 * @internal
 */
export interface InternalElasticsearchServiceStart extends ElasticsearchServiceStart {
  /**
   * A pre-configured {@link IClusterClient | Elasticsearch client}
   *
   * @example
   * ```js
   * const client = core.elasticsearch.client;
   * ```
   */
  readonly client: IClusterClient;
  /**
   * Create application specific Elasticsearch cluster API client with customized config. See {@link IClusterClient}.
   *
   * @param type Unique identifier of the client
   * @param clientConfig A config consists of Elasticsearch JS client options and
   * valid sub-set of Elasticsearch service config.
   * We fill all the missing properties in the `clientConfig` using the default
   * Elasticsearch config so that we don't depend on default values set and
   * controlled by underlying Elasticsearch JS client.
   * We don't run validation against the passed config and expect it to be valid.
   *
   * @example
   * ```js
   * const client = elasticsearch.createClient('my-app-name', config);
   * const data = await client.asInternalUser().search();
   * ```
   */
  readonly createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ICustomClusterClient;
}

/** @public */
export interface ElasticsearchStatusMeta {
  warningNodes: NodesVersionCompatibility['warningNodes'];
  incompatibleNodes: NodesVersionCompatibility['incompatibleNodes'];
}

/**
 * Fake request object created manually by Kibana plugins.
 * @public
 */
export interface FakeRequest {
  /** Headers used for authentication against Elasticsearch */
  headers: Headers;
}

/**
 A user credentials container.
 * It accommodates the necessary auth credentials to impersonate the current user.
 *
 * @public
 * See {@link KibanaRequest}.
 */
export type ScopeableRequest = KibanaRequest | LegacyRequest | FakeRequest;
