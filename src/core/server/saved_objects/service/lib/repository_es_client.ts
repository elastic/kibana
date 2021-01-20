/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';

import { ElasticsearchClient } from '../../../elasticsearch/';
import { retryCallCluster } from '../../../elasticsearch/client/retry_call_cluster';
import { decorateEsError } from './decorate_es_error';

const methods = [
  'bulk',
  'create',
  'delete',
  'get',
  'index',
  'mget',
  'search',
  'update',
  'updateByQuery',
] as const;

type MethodName = typeof methods[number];

export type RepositoryEsClient = Pick<ElasticsearchClient, MethodName>;

export function createRepositoryEsClient(client: ElasticsearchClient): RepositoryEsClient {
  return methods.reduce((acc: RepositoryEsClient, key: MethodName) => {
    Object.defineProperty(acc, key, {
      value: async (params?: unknown, options?: TransportRequestOptions) => {
        try {
          return await retryCallCluster(() =>
            (client[key] as Function)(params, { maxRetries: 0, ...options })
          );
        } catch (e) {
          throw decorateEsError(e);
        }
      },
    });
    return acc;
  }, {} as RepositoryEsClient);
}
