/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * and the Server Side Public License, v 1; you may not use this file except in
 * compliance with, at your election, the Elastic License or the Server Side
 * Public License, v 1.
 */

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
  bulk: ElasticsearchClient['bulk'];
  cat: {
    templates: ElasticsearchClient['cat']['templates'];
  };
  clearScroll: ElasticsearchClient['clearScroll'];
  count: ElasticsearchClient['count'];
  indices: {
    create: ElasticsearchClient['indices']['create'];
    delete: ElasticsearchClient['indices']['delete'];
    deleteTemplate: ElasticsearchClient['indices']['deleteTemplate'];
    get: ElasticsearchClient['indices']['get'];
    getAlias: ElasticsearchClient['indices']['getAlias'];
    refresh: ElasticsearchClient['indices']['refresh'];
    updateAliases: ElasticsearchClient['indices']['updateAliases'];
  };
  reindex: ElasticsearchClient['reindex'];
  search: ElasticsearchClient['search'];
  scroll: ElasticsearchClient['scroll'];
  tasks: {
    get: ElasticsearchClient['tasks']['get'];
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
        () => fn.call(client, params, { maxRetries: 0, ...options }),
        log,
        delay
      );
    });
    return acc;
  }, {} as MigrationEsClient);
}
