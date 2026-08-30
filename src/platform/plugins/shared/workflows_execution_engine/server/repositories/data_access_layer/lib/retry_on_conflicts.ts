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
import { retryTransientEsErrors } from '../../../lib/retry_transient_es_errors';
import type {
  BulkItem,
  BulkItemResponse,
  BulkItemResult,
  BulkPlainItem,
  BulkRequestOptions,
  BulkResponse,
  BulkUpdaterItem,
} from '../types';
import { isBulkUpdaterItem } from '../types';

interface QueueItem<TExecution extends { id: string }> {
  item: BulkItem<TExecution>;
  originalIndex: number;
  remainingRetries: number;
}

export async function retryOnConflicts<TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexes: string[],
  options: BulkRequestOptions<TExecution>,
  action: (request: BulkRequestOptions<TExecution>) => Promise<estypes.BulkResponse>
): Promise<BulkResponse> {
  let queuedItems: Array<QueueItem<TExecution>> = options.items.map((item, index) => ({
    item,
    originalIndex: index,
    remainingRetries: item.retryOnConflict ?? 0,
  }));

  const result = new Array<BulkItemResponse>(options.items.length);
  let hasErrors = false;

  while (queuedItems.length > 0) {
    const batch = queuedItems.splice(0);

    // Collect updater items so we can mget their current source + seqNo in one request.
    // Each updater item × each index — first found result per id wins.
    const updaterBatch = batch.filter(
      (qi): qi is QueueItem<TExecution> & { item: BulkUpdaterItem<TExecution> } =>
        isBulkUpdaterItem(qi.item)
    );

    const foundById = new Map<
      string,
      { source: TExecution; seqNo: number; primaryTerm: number; index: string }
    >();

    if (updaterBatch.length > 0) {
      const mgetDocs = updaterBatch.flatMap(({ item }) =>
        indexes.map((index) => ({
          _id: item.documentId,
          _index: index,
          ...(item.sourceFields.length > 0 ? { _source_includes: [...item.sourceFields] } : {}),
        }))
      );

      const mgetResponse = await retryTransientEsErrors(
        () => esClient.mget<TExecution>({ docs: mgetDocs }),
        { logger }
      );

      for (const doc of mgetResponse.docs) {
        if (
          'found' in doc &&
          doc.found &&
          doc._source &&
          doc._seq_no !== undefined &&
          doc._primary_term !== undefined &&
          !foundById.has(doc._id)
        ) {
          foundById.set(doc._id, {
            source: doc._source as TExecution,
            seqNo: doc._seq_no,
            primaryTerm: doc._primary_term,
            index: doc._index,
          });
        }
      }
    }

    // Resolve each batch item: updater items become plain items (or settle immediately as
    // noop/missing); plain items pass through unchanged.
    interface Sendable {
      qi: QueueItem<TExecution>;
      plainItem: BulkPlainItem<TExecution>;
    }
    const toSend: Sendable[] = [];

    for (const qi of batch) {
      if (isBulkUpdaterItem(qi.item)) {
        const updaterItem = qi.item;
        const found = foundById.get(updaterItem.documentId);

        if (!found) {
          result[qi.originalIndex] = {
            id: updaterItem.documentId,
            index: indexes[0] ?? '',
            error: {
              type: 'document_missing_exception',
              reason: `[_doc][${updaterItem.documentId}]: document missing`,
            },
          };
          hasErrors = true;
        } else {
          const patch = updaterItem.updater(
            found.source as Pick<TExecution, keyof TExecution & string>
          );

          if (patch === 'noop') {
            result[qi.originalIndex] = {
              id: updaterItem.documentId,
              index: found.index,
              seqNo: found.seqNo,
              primaryTerm: found.primaryTerm,
              result: 'noop',
            };
          } else {
            toSend.push({
              qi,
              plainItem: {
                operation: 'update',
                document: { ...(patch as Partial<TExecution>), id: updaterItem.documentId },
                index: found.index,
                seqNo: found.seqNo,
                primaryTerm: found.primaryTerm,
              },
            });
          }
        }
      } else {
        toSend.push({ qi, plainItem: qi.item as BulkPlainItem<TExecution> });
      }
    }

    if (toSend.length > 0) {
      const esResponse = await action({
        ...options,
        items: toSend.map(({ plainItem }) => plainItem),
      });

      const nextQueue: Array<QueueItem<TExecution>> = [];

      esResponse.items.forEach((esItem, idx) => {
        const { qi } = toSend[idx];
        const esResult = esItem.create ?? esItem.index ?? esItem.update;

        if (!esResult?._id) {
          throw new Error(`Unexpected bulk response item without _id: ${JSON.stringify(esItem)}`);
        }

        const responseItem: BulkItemResponse = {
          id: esResult._id,
          error: esResult.error,
          index: esResult._index,
          seqNo: esResult._seq_no,
          primaryTerm: esResult._primary_term,
          result: esResult.result as BulkItemResult | undefined,
        };

        const isConflict = responseItem.error?.type === 'version_conflict_engine_exception';

        if (isConflict && qi.remainingRetries > 0) {
          nextQueue.push({ ...qi, remainingRetries: qi.remainingRetries - 1 });
        } else {
          result[qi.originalIndex] = responseItem;
          hasErrors = hasErrors || !!responseItem.error;
        }
      });

      queuedItems = nextQueue;
    }
    // toSend empty → queuedItems already empty from splice(0) → loop exits naturally.
  }

  return { items: result, errors: hasErrors };
}
