/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import { ES_CLIENT_API_VERSION, ES_CLIENT_BASE_PATH } from '../common';
import type { EsClient } from './es_client/types';
import type { ProxyFetch } from './es_client/proxy_transport';
import type { EsClientPluginSetup } from './plugin';

/**
 * Creates the browser client that sends requests through the Elasticsearch proxy.
 */
export const proxyService = (http: HttpSetup): EsClientPluginSetup => {
  const proxyFetch: ProxyFetch = ({ path, body, ...options }, rawResponse) =>
    // `no_unsafe_dynamic_http_path` warns here because it can't see that elasticsearch-js
    // already URI-encodes every path param, so `path` is safe to append as-is.
    // codeql[js/kibana/unsafe-dynamic-http-path] elasticsearch-js URI-encodes every path param; the transport rejects "." and ".." segments
    http.fetch(`${ES_CLIENT_BASE_PATH}${path}`, {
      ...options,
      body: typeof body === 'object' ? JSON.stringify(body) : body,
      version: ES_CLIENT_API_VERSION,
      asResponse: true,
      rawResponse,
    });
  const loadClient = async (): Promise<EsClient> => {
    const { createEsClient } = await import('./es_client');
    return createEsClient(proxyFetch);
  };
  let client: Promise<EsClient> | undefined;

  return {
    getClient: () => {
      // A failed load is not cached, so a later call can retry, for example after a chunk load error.
      client ??= loadClient().catch((error) => {
        client = undefined;
        throw error;
      });
      return client;
    },
  };
};
