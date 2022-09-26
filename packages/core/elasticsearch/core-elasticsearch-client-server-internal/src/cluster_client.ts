/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { Client } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/logging';
import type { Headers, IAuthHeadersStorage } from '@kbn/core-http-server';
import {
  ensureRawRequest,
  filterHeaders,
  isKibanaRequest,
  isRealRequest,
} from '@kbn/core-http-router-server-internal';
import type {
  ScopeableRequest,
  UnauthorizedErrorHandler,
  ICustomClusterClient,
} from '@kbn/core-elasticsearch-server';
import type { ElasticsearchClientConfig } from '@kbn/core-elasticsearch-server';
import { configureClient } from './configure_client';
import { ScopedClusterClient } from './scoped_cluster_client';
import { getDefaultHeaders } from './headers';
import { createInternalErrorHandler, InternalUnauthorizedErrorHandler } from './retry_unauthorized';
import { createTransport } from './create_transport';
import { AgentManager } from './agent_manager';

const noop = () => undefined;

/** @internal **/
export class ClusterClient implements ICustomClusterClient {
  private readonly config: ElasticsearchClientConfig;
  private readonly authHeaders?: IAuthHeadersStorage;
  private readonly rootScopedClient: Client;
  private readonly kibanaVersion: string;
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
    agentManager,
    kibanaVersion,
  }: {
    config: ElasticsearchClientConfig;
    logger: Logger;
    type: string;
    authHeaders?: IAuthHeadersStorage;
    getExecutionContext?: () => string | undefined;
    getUnauthorizedErrorHandler?: () => UnauthorizedErrorHandler | undefined;
    agentManager: AgentManager;
    kibanaVersion: string;
  }) {
    this.config = config;
    this.authHeaders = authHeaders;
    this.kibanaVersion = kibanaVersion;
    this.getExecutionContext = getExecutionContext;
    this.getUnauthorizedErrorHandler = getUnauthorizedErrorHandler;

    this.asInternalUser = configureClient(config, {
      logger,
      type,
      getExecutionContext,
      agentManager,
      kibanaVersion,
    });
    this.rootScopedClient = configureClient(config, {
      logger,
      type,
      getExecutionContext,
      scoped: true,
      agentManager,
      kibanaVersion,
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
      ...getDefaultHeaders(this.kibanaVersion),
      ...this.config.customHeaders,
      ...scopedHeaders,
    };
  }
}
