/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { Client } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { GetAuthHeaders, Headers, isKibanaRequest, isRealRequest } from '../../http';
import { ensureRawRequest, filterHeaders } from '../../http/router';
import { ScopeableRequest } from '../types';
import { ElasticsearchClient } from './types';
import { configureClient } from './configure_client';
import { ElasticsearchClientConfig } from './client_config';
import { ScopedClusterClient, IScopedClusterClient } from './scoped_cluster_client';
import { DEFAULT_HEADERS } from '../default_headers';

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

/** @internal **/
export class ClusterClient implements ICustomClusterClient {
  public readonly asInternalUser: Client;
  private readonly rootScopedClient: Client;
  private readonly allowListHeaders: string[];

  private isClosed = false;

  constructor(
    private readonly config: ElasticsearchClientConfig,
    logger: Logger,
    type: string,
    private readonly getAuthHeaders: GetAuthHeaders = noop,
    getExecutionContext: () => string | undefined = noop
  ) {
    this.asInternalUser = configureClient(config, { logger, type, getExecutionContext });
    this.rootScopedClient = configureClient(config, {
      logger,
      type,
      getExecutionContext,
      scoped: true,
    });

    this.allowListHeaders = ['x-opaque-id', ...this.config.requestHeadersWhitelist];
  }

  asScoped(request: ScopeableRequest) {
    const scopedHeaders = this.getScopedHeaders(request);
    const scopedClient = this.rootScopedClient.child({
      headers: scopedHeaders,
    });
    return new ScopedClusterClient(this.asInternalUser, scopedClient);
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
      const requestHeaders = ensureRawRequest(request).headers;
      const requestIdHeaders = isKibanaRequest(request) ? { 'x-opaque-id': request.id } : {};
      const authHeaders = this.getAuthHeaders(request);

      scopedHeaders = filterHeaders(
        { ...requestHeaders, ...requestIdHeaders, ...authHeaders },
        this.allowListHeaders
      );
    } else {
      scopedHeaders = filterHeaders(request?.headers ?? {}, this.config.requestHeadersWhitelist);
    }

    return {
      ...DEFAULT_HEADERS,
      ...this.config.customHeaders,
      ...scopedHeaders,
    };
  }
}
