/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { TransportRequestOptions } from '@elastic/elasticsearch';

import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { retryCallCluster } from '@kbn/core-elasticsearch-server-internal';
import { decorateEsError } from './utils';

const methods = [
  'bulk',
  'closePointInTime',
  'create',
  'delete',
  'get',
  'index',
  'mget',
  'openPointInTime',
  'search',
  'update',
  'updateByQuery',
] as const;

type MethodName = typeof methods[number];

export type RepositoryEsClient = Pick<ElasticsearchClient, MethodName | 'transport'>;

export function createRepositoryEsClient(client: ElasticsearchClient): RepositoryEsClient {
  return methods.reduce((acc: RepositoryEsClient, key: MethodName) => {
    Object.defineProperty(acc, key, {
      value: async (params?: unknown, options?: TransportRequestOptions) => {
        try {
          return await retryCallCluster(() => (client[key] as Function)(params, options ?? {}));
        } catch (e) {
          // retry failures are caught here, as are 404's that aren't ignored (e.g update calls)
          throw decorateEsError(e);
        }
      },
    });
    return acc;
  }, {} as RepositoryEsClient);
}
