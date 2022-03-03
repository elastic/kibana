/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import { Logger } from '../../logging';
import { IAuthHeadersStorage, Headers, isKibanaRequest, isRealRequest } from '../../http';
import { ensureRawRequest, filterHeaders } from '../../http/router';
import { ScopeableRequest } from '../types';
import { ElasticsearchClient } from './types';
import { configureClient } from './configure_client';
import { ElasticsearchClientConfig } from './client_config';
import { ScopedClusterClient, IScopedClusterClient } from './scoped_cluster_client';
import { DEFAULT_HEADERS } from '../default_headers';
import {
  UnauthorizedErrorHandler,
  createInternalErrorHandler,
  InternalUnauthorizedErrorHandler,
} from './retry_unauthorized';
import { createTransport } from './create_transport';

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
  private readonly config: ElasticsearchClientConfig;
  private readonly authHeaders?: IAuthHeadersStorage;
  private readonly rootScopedClient: Client;
  private readonly getUnauthorizedErrorHandler: () => UnauthorizedErrorHandler | undefined;
  private readonly getExecutionContext: () => string | undefined;
  private isClosed = false;

  public readonly asInternalUser: Client;

  constructor({
    config,
    logger,
    type,
    authHeaders,
    getExecutionContext = noop,
    getUnauthorizedErrorHandler = noop,
  }: {
    config: ElasticsearchClientConfig;
    logger: Logger;
    type: string;
    authHeaders?: IAuthHeadersStorage;
    getExecutionContext?: () => string | undefined;
    getUnauthorizedErrorHandler?: () => UnauthorizedErrorHandler | undefined;
  }) {
    this.config = config;
    this.authHeaders = authHeaders;
    this.getExecutionContext = getExecutionContext;
    this.getUnauthorizedErrorHandler = getUnauthorizedErrorHandler;

    this.asInternalUser = configureClient(config, { logger, type, getExecutionContext });
    this.rootScopedClient = configureClient(config, {
      logger,
      type,
      getExecutionContext,
      scoped: true,
    });
  }

  asScoped(request: ScopeableRequest) {
    const scopedHeaders = this.getScopedHeaders(request);

    const transportClass = createTransport({
      getExecutionContext: this.getExecutionContext,
      getUnauthorizedErrorHandler: this.createInternalErrorHandlerAccessor(request),
    });

    const scopedClient = this.rootScopedClient.child({
      headers: scopedHeaders,
      Transport: transportClass,
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

  private createInternalErrorHandlerAccessor = (
    request: ScopeableRequest
  ): (() => InternalUnauthorizedErrorHandler) | undefined => {
    if (!this.authHeaders) {
      return undefined;
    }
    return () =>
      createInternalErrorHandler({
        request,
        getHandler: this.getUnauthorizedErrorHandler,
        setAuthHeaders: this.authHeaders!.set,
      });
  };

  private getScopedHeaders(request: ScopeableRequest): Headers {
    let scopedHeaders: Headers;
    if (isRealRequest(request)) {
      const requestHeaders = ensureRawRequest(request).headers ?? {};
      const requestIdHeaders = isKibanaRequest(request) ? { 'x-opaque-id': request.id } : {};
      const authHeaders = this.authHeaders ? this.authHeaders.get(request) : {};

      scopedHeaders = {
        ...filterHeaders(requestHeaders, this.config.requestHeadersWhitelist),
        ...requestIdHeaders,
        ...authHeaders,
      };
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
