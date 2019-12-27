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
import { ElasticsearchConfig } from './elasticsearch_config';
import { ElasticsearchClientConfig } from './elasticsearch_client_config';
import { IClusterClient, ICustomClusterClient } from './cluster_client';

/**
 * @public
 */
export interface ElasticsearchServiceSetup {
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
   * const client = elasticsearch.createCluster('my-app-name', config);
   * const data = await client.callAsInternalUser();
   * ```
   */
  readonly createClient: (
    type: string,
    clientConfig?: Partial<ElasticsearchClientConfig>
  ) => ICustomClusterClient;

  /**
   * Observable of clients for the `admin` cluster. Observable emits when Elasticsearch config changes on the Kibana
   * server. See {@link IClusterClient}.
   *
   * @example
   * ```js
   * const client = await elasticsearch.adminClient$.pipe(take(1)).toPromise();
   * ```
   */
  readonly adminClient: IClusterClient;

  /**
   * Observable of clients for the `data` cluster. Observable emits when Elasticsearch config changes on the Kibana
   * server. See {@link IClusterClient}.
   *
   * @example
   * ```js
   * const client = await elasticsearch.dataClient$.pipe(take(1)).toPromise();
   * ```
   */
  readonly dataClient: IClusterClient;
}

/** @internal */
export interface InternalElasticsearchServiceSetup extends ElasticsearchServiceSetup {
  // Required for the BWC with the legacy Kibana only.
  readonly legacy: {
    readonly config$: Observable<ElasticsearchConfig>;
  };

  readonly adminClient$: Observable<IClusterClient>;
  readonly dataClient$: Observable<IClusterClient>;
}
