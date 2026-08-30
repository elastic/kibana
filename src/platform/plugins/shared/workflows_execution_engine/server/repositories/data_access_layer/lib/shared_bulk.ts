/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { retryOnConflicts } from './retry_on_conflicts';
import { retryTransientEsErrors } from '../../../lib/retry_transient_es_errors';
import type { BulkPlainItem, BulkRequestOptions, BulkResponse } from '../types';

export type SharedBulkItem<TExecution extends { id: string }> = BulkPlainItem<TExecution>;

export interface SharedBulkRequestOptions<TExecution extends { id: string }>
  extends BulkRequestOptions<TExecution> {
  items: SharedBulkItem<TExecution>[];
}

type BulkOperation<TExecution extends { id: string }> = NonNullable<
  estypes.BulkRequest<TExecution, Partial<TExecution> & { id: string }>['operations']
>[number];

const toBulkOperations = <TExecution extends { id: string }>(
  item: SharedBulkItem<TExecution>
): Array<BulkOperation<TExecution>> => {
  const actionMeta = {
    _id: item.document.id,
    _index: item.index,
    ...(item.seqNo !== undefined ? { if_seq_no: item.seqNo } : {}),
    ...(item.primaryTerm !== undefined ? { if_primary_term: item.primaryTerm } : {}),
  };

  switch (item.operation) {
    case 'create':
      return [{ create: actionMeta }, item.document as BulkOperation<TExecution>];

    case 'update':
      return [
        {
          update: {
            ...actionMeta,
            // retry_on_conflict is mutually exclusive with if_seq_no/if_primary_term —
            // ES ignores it when version-based CAS fields are present.
            ...(item.retryOnConflict !== undefined && item.seqNo === undefined
              ? { retry_on_conflict: item.retryOnConflict }
              : {}),
          },
        },
        { doc: item.document },
      ];

    case 'upsert':
      return [
        {
          update: {
            ...actionMeta,
            ...(item.retryOnConflict !== undefined && item.seqNo === undefined
              ? { retry_on_conflict: item.retryOnConflict }
              : {}),
          },
        },
        { doc: item.document, doc_as_upsert: true },
      ];

    default:
      throw new Error(`Invalid operation: ${(item as SharedBulkItem<TExecution>).operation}`);
  }
};

export async function sharedBulk<TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  request: SharedBulkRequestOptions<TExecution>,
  logger: Logger
): Promise<BulkResponse> {
  if (request.items.length === 0) {
    return { items: [], errors: false };
  }

  // retryOnConflicts handles the conflict-retry loop. sharedBulk passes [] for indexes
  // because it only receives BulkPlainItem — no updater items need mget resolution here.
  return retryOnConflicts(esClient, logger, [], request, async (bulkRequest) => {
    // Items passed back by retryOnConflicts are the original SharedBulkItem objects
    // (cast to BulkPlainItem by retryOnConflicts — index is still present at runtime).
    const operations = (bulkRequest.items as Array<SharedBulkItem<TExecution>>).flatMap(
      toBulkOperations
    );

    return retryTransientEsErrors(
      () =>
        esClient.bulk<TExecution, Partial<TExecution> & { id: string }>({
          refresh: bulkRequest.refresh,
          operations,
        }),
      { logger }
    );
  });
}
