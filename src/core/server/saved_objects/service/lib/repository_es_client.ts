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
