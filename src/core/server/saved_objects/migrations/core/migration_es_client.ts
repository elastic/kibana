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
import type { KibanaClient } from '@elastic/elasticsearch/api/kibana';
import type { TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport';
import { get } from 'lodash';
import { set } from '@elastic/safer-lodash-set';

import { ElasticsearchClient } from '../../../elasticsearch';
import { migrationRetryCallCluster } from '../../../elasticsearch/client/retry_call_cluster';
import { Logger } from '../../../logging';

const methods = [
  'bulk',
  'cat.templates',
  'clearScroll',
  'count',
  'indices.create',
  'indices.delete',
  'indices.deleteTemplate',
  'indices.get',
  'indices.getAlias',
  'indices.refresh',
  'indices.updateAliases',
  'reindex',
  'search',
  'scroll',
  'tasks.get',
] as const;

type MethodName = typeof methods[number];

export interface MigrationEsClient {
  bulk: KibanaClient['bulk'];
  cat: {
    templates: KibanaClient['cat']['templates'];
  };
  clearScroll: KibanaClient['clearScroll'];
  count: KibanaClient['count'];
  indices: {
    create: KibanaClient['indices']['create'];
    delete: KibanaClient['indices']['delete'];
    deleteTemplate: KibanaClient['indices']['deleteTemplate'];
    get: KibanaClient['indices']['get'];
    getAlias: KibanaClient['indices']['getAlias'];
    refresh: KibanaClient['indices']['refresh'];
    updateAliases: KibanaClient['indices']['updateAliases'];
  };
  reindex: KibanaClient['reindex'];
  search: KibanaClient['search'];
  scroll: KibanaClient['scroll'];
  tasks: {
    get: KibanaClient['tasks']['get'];
  };
}

export function createMigrationEsClient(
  client: ElasticsearchClient,
  log: Logger,
  delay?: number
): MigrationEsClient {
  return methods.reduce((acc: MigrationEsClient, key: MethodName) => {
    set(acc, key, async (params?: unknown, options?: TransportRequestOptions) => {
      const fn = get(client, key);
      if (!fn) {
        throw new Error(`unknown ElasticsearchClient client method [${key}]`);
      }
      return await migrationRetryCallCluster(
        () => fn(params, { maxRetries: 0, ...options }),
        log,
        delay
      );
    });
    return acc;
  }, {} as MigrationEsClient);
}
