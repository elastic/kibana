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

import { Client } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { GetAuthHeaders, isRealRequest, Headers } from '../../http';
import { ensureRawRequest, filterHeaders } from '../../http/router';
import { ScopeableRequest } from '../types';
import { getClientFacade } from './get_client_facade';
import { ClientFacade } from './client_facade';
import { configureClient } from './configure_client';
import { ElasticsearchClientConfig } from './client_config';
import { ScopedClusterClient, IScopedClusterClient } from './scoped_cluster_client';

const noop = () => undefined;

/**
 * Represents an Elasticsearch cluster API client created by the platform.
 * It allows to call API on behalf of the internal Kibana user and
 * the actual user that is derived from the request headers (via `asScoped(...)`).
 *
 * @public
 **/
export interface IClusterClient {
  /**
   * Returns a {@link ClientFacade | facade} to be used to query the ES cluster on behalf of the Kibana internal user
   */
  asInternalUser: () => ClientFacade;
  /**
   * Creates a {@link IScopedClusterClient | scoped cluster client} bound to given {@link ScopeableRequest | request}
   */
  asScoped: (request: ScopeableRequest) => IScopedClusterClient;
}

/**
 * See {@link IClusterClient}
 *
 * @public
 */
export interface ICustomClusterClient extends IClusterClient {
  /**
   * Closes the cluster client. After that client cannot be used and one should
   * create a new client instance to be able to interact with Elasticsearch API.
   */
  close: () => void;
}

/** @internal **/
export class ClusterClient implements IClusterClient, ICustomClusterClient {
  private readonly internalClient: Client;
  private readonly scopedClient: Client;

  private readonly internalFacade: ClientFacade;
  private isClosed = false;

  constructor(
    private readonly config: ElasticsearchClientConfig,
    logger: Logger,
    private readonly getAuthHeaders: GetAuthHeaders = noop
  ) {
    this.internalClient = configureClient(config, { logger });
    this.internalFacade = getClientFacade(this.internalClient);
    this.scopedClient = configureClient(config, { logger, scoped: true });
  }

  asInternalUser() {
    return this.internalFacade;
  }

  asScoped(request: ScopeableRequest) {
    const headers = this.getScopedHeaders(request);
    const scopedWrapper = getClientFacade(this.scopedClient, headers);
    return new ScopedClusterClient(this.internalFacade, scopedWrapper);
  }

  public close() {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    this.internalClient.close();
    this.scopedClient.close();
  }

  private getScopedHeaders(request: ScopeableRequest): Headers {
    if (!isRealRequest(request)) {
      return filterHeaders(request?.headers ?? {}, this.config.requestHeadersWhitelist);
    }
    const authHeaders = this.getAuthHeaders(request);
    const headers = ensureRawRequest(request).headers;

    return filterHeaders({ ...headers, ...authHeaders }, this.config.requestHeadersWhitelist);
  }
}
