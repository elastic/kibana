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

import { Client, ApiError, RequestEvent } from '@elastic/elasticsearch';
import { AuditorFactory } from '../../audit_trail';
import { Logger } from '../../logging';
import { GetAuthHeaders, isRealRequest, Headers, KibanaRequest } from '../../http';
import { ensureRawRequest, filterHeaders } from '../../http/router';
import { ScopeableRequest } from '../types';
import { ElasticsearchClient } from './types';
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
   * A {@link ElasticsearchClient | client} to be used to query the ES cluster on behalf of the Kibana internal user
   */
  readonly asInternalUser: ElasticsearchClient;
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
  close: () => Promise<void>;
}
let counter = 0;
/** @internal **/
export class ClusterClient implements ICustomClusterClient {
  public readonly asInternalUser: Client;
  private readonly rootScopedClient: Client;

  private isClosed = false;

  constructor(
    private readonly config: ElasticsearchClientConfig,
    logger: Logger,
    private readonly auditorFactory: AuditorFactory,
    private readonly getAuthHeaders: GetAuthHeaders = noop
  ) {
    this.asInternalUser = configureClient(config, { logger });
    this.rootScopedClient = configureClient(config, { logger, scoped: true });
  }

  asScoped(request: ScopeableRequest) {
    const id = `scoped-client-${counter++}`;
    const scopedClient = this.rootScopedClient.child({
      headers: this.getScopedHeaders(request),
      name: id,
    });
    const internalClient = this.asInternalUser.child({ name: id });

    this.integrateAuditor(internalClient, scopedClient, request, id);
    return new ScopedClusterClient(internalClient, scopedClient);
  }

  public async close() {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    await Promise.all([this.asInternalUser.close(), this.rootScopedClient.close()]);
  }

  private getScopedHeaders(request: ScopeableRequest): Headers {
    let scopedHeaders: Headers;
    if (isRealRequest(request)) {
      const authHeaders = this.getAuthHeaders(request);
      const requestHeaders = ensureRawRequest(request).headers;
      scopedHeaders = filterHeaders(
        { ...requestHeaders, ...authHeaders },
        this.config.requestHeadersWhitelist
      );
    } else {
      scopedHeaders = filterHeaders(request?.headers ?? {}, this.config.requestHeadersWhitelist);
    }

    return {
      ...this.config.customHeaders,
      ...scopedHeaders,
    };
  }

  private getScopedAuditor(request: ScopeableRequest) {
    // TODO: support alternative credential owners from outside of Request context in #39430
    if (isRealRequest(request)) {
      const kibanaRequest =
        request instanceof KibanaRequest ? request : KibanaRequest.from(request);
      return this.auditorFactory.asScoped(kibanaRequest);
    }
  }

  /** All requests made by clients are written in the auditor for further analysis. */
  private integrateAuditor(
    internalClient: ElasticsearchClient,
    scopedClient: ElasticsearchClient,
    request: ScopeableRequest,
    id: string
  ) {
    const auditor = this.getScopedAuditor(request);
    if (auditor) {
      internalClient.on('request', (err: ApiError, event: RequestEvent) => {
        // Child clients share the event bus. The guard filters out events not related to the client.
        if (event.meta.name === id) {
          auditor.add({
            message: `${event.meta.request.params.method} ${event.meta.request.params.path}`,
            type: 'elasticsearch.call.internalUser',
          });
        }
      });

      scopedClient.on('request', (err: ApiError, event: RequestEvent) => {
        if (event.meta.name === id) {
          auditor.add({
            message: `${event.meta.request.params.method} ${event.meta.request.params.path}`,
            type: 'elasticsearch.call.currentUser',
          });
        }
      });
    }
  }
}
