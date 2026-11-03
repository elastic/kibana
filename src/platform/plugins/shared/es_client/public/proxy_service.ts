/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { HttpSetup } from '@kbn/core/public';
import type { EsClientRequestParams } from '../common/types';
import type { EsClient } from './es_client/types';
import type { EsClientPluginSetup } from './plugin';
import { proxyArgsToEsArgs } from './proxy_args_to_es_args';

/**
 * Creates the browser client that sends requests through the Elasticsearch proxy.
 */
export const proxyService = (http: HttpSetup): EsClientPluginSetup => {
  const request = <T>(params: EsClientRequestParams) => http.fetch<T>(...proxyArgsToEsArgs(params));
  const loadClient = async (): Promise<EsClient> => {
    const { createEsClient } = await import('./es_client');
    return createEsClient(request);
  };
  let client: Promise<EsClient> | undefined;

  return {
    request,
    stream: async (params) => {
      const [path, options] = proxyArgsToEsArgs(params);
      const { response } = await http.fetch(path, {
        ...options,
        asResponse: true,
        rawResponse: true,
      });
      if (!response) {
        throw new Error(`No response received for ${params.method} ${path}`);
      }
      return response;
    },
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
