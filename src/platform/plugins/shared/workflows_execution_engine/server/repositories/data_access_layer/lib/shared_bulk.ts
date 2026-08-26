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
import type { BulkItem, BulkItemResponse, BulkRequestOptions, BulkResponse } from '..';
import { retryTransientEsErrors } from '../../../lib/retry_transient_es_errors';

export interface SharedBulkItem<TExecution extends { id: string }> extends BulkItem<TExecution> {
  operation: 'create' | 'update' | 'upsert';
  document: Partial<TExecution> & { id: string };
  index?: string;
  seqNo?: number;
  primaryTerm?: number;
  retryOnConflict?: number;
}

export interface SharedBulkRequestOptions<TExecution extends { id: string }>
  extends BulkRequestOptions<TExecution> {
  items: SharedBulkItem<TExecution>[];
}

export async function sharedBulk<TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  request: SharedBulkRequestOptions<TExecution>,
  logger: Logger
): Promise<BulkResponse> {
  if (request.items.length === 0) {
    return {
      items: [],
      errors: false,
    };
  }

  type BulkOperation = NonNullable<
    estypes.BulkRequest<TExecution, Partial<TExecution> & { id: string }>['operations']
  >[number];

  const operations: BulkOperation[] = request.items.flatMap((item): BulkOperation[] => {
    const actionMeta = {
      _id: item.document.id,
      _index: item.index,
      ...(item.seqNo !== undefined ? { if_seq_no: item.seqNo } : {}),
      ...(item.primaryTerm !== undefined ? { if_primary_term: item.primaryTerm } : {}),
    };

    switch (item.operation) {
      case 'create':
        return [{ create: actionMeta }, item.document as BulkOperation];

      case 'update':
        return [
          {
            update: {
              ...actionMeta,
              ...(item.retryOnConflict !== undefined
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
              ...(item.retryOnConflict !== undefined
                ? { retry_on_conflict: item.retryOnConflict }
                : {}),
            },
          },
          { doc: item.document, doc_as_upsert: true },
        ];

      default:
        throw new Error(`Invalid operation: ${(item as BulkItem<TExecution>).operation}`);
    }
  });

  const response = await retryTransientEsErrors(
    () =>
      esClient.bulk<TExecution, Partial<TExecution> & { id: string }>({
        refresh: request.refresh,
        operations,
      }),
    { logger }
  );

  const items: BulkItemResponse[] = [];

  response.items.forEach((item) => {
    const result = item.create ?? item.update;
    if (!result?._id) {
      throw new Error(`Unexpected bulk response item without _id: ${JSON.stringify(item)}`);
    }

    items.push({
      id: result._id,
      error: result.error,
      index: result._index,
      seqNo: result._seq_no,
      primaryTerm: result._primary_term,
    });
  });

  return {
    items,
    errors: response.errors,
  };
}
