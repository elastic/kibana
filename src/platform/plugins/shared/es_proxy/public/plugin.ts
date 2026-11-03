/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Plugin, CoreSetup, CoreStart } from '@kbn/core/public';
import type { EsProxyRequestParams } from '../common/types';
import type { EsProxyClient } from './es_client/types';
import { proxyService } from './proxy_service';

export interface EsProxyPluginSetup {
  /** Sends a request and resolves with the parsed response body. */
  request: <T>(params: EsProxyRequestParams) => Promise<T>;
  /**
   * Sends a request and resolves with the unread `Response`, for streamed or binary output such as
   * server-sent events or `_query?format=arrow`.
   */
  stream: (params: EsProxyRequestParams) => Promise<Readonly<Response>>;
  /**
   * Resolves with an elasticsearch-js API client that sends every call through the proxy. The
   * client code is loaded on first use.
   */
  getClient: () => Promise<EsProxyClient>;
}

export type EsProxyPluginStart = EsProxyPluginSetup;

export class EsProxyPlugin implements Plugin<EsProxyPluginSetup, EsProxyPluginStart, {}, {}> {
  public setup({ http }: CoreSetup): EsProxyPluginSetup {
    return proxyService(http);
  }

  public start({ http }: CoreStart): EsProxyPluginStart {
    return proxyService(http);
  }

  public stop() {}
}
