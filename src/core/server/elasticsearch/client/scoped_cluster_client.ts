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

import { ElasticsearchClient } from './types';

/**
 * Serves the same purpose as the normal {@link ClusterClient | cluster client} but exposes
 * an additional `asCurrentUser` method that doesn't use credentials of the Kibana internal
 * user (as `asInternalUser` does) to request Elasticsearch API, but rather passes HTTP headers
 * extracted from the current user request to the API instead.
 *
 * @public
 **/
export interface IScopedClusterClient {
  /**
   * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
   * on behalf of the internal Kibana user.
   */
  readonly asInternalUser: ElasticsearchClient;
  /**
   * A {@link ElasticsearchClient | client} to be used to query the elasticsearch cluster
   * on behalf of the user that initiated the request to the Kibana server.
   */
  readonly asCurrentUser: ElasticsearchClient;
}

/** @internal **/
export class ScopedClusterClient implements IScopedClusterClient {
  constructor(
    public readonly asInternalUser: ElasticsearchClient,
    public readonly asCurrentUser: ElasticsearchClient
  ) {}
}
