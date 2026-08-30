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
import {
  type BulkItem,
  type BulkItemResponse,
  type BulkItemResult,
  type BulkPlainItem,
  type BulkRequestOptions,
  type BulkResponse,
  type BulkUpdaterItem,
  isBulkUpdaterItem,
} from '../types';

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

interface QueueItem<TExecution extends { id: string }> {
  item: BulkItem<TExecution>;
  originalIndex: number;
  remainingRetries: number;
}

interface DocumentVersion {
  index: string;
  seqNo: number;
  primaryTerm: number;
}

const fetchFreshVersions = async (
  esClient: ElasticsearchClient,
  logger: Logger,
  ids: {
    id: string;
    index?: string;
  }[],
  fallbackIndexes: string[]
): Promise<Map<string, DocumentVersion>> => {
  const mgetDocs = ids.flatMap(({ id, index }) => {
    if (index) {
      return [{ _id: id, _index: index, _source: false as const }];
    }

    return fallbackIndexes.map((fallbackIndex) => ({
      _id: id,
      _index: fallbackIndex,
      _source: false as const,
    }));
  });

  const mgetResponse = await retryTransientEsErrors(() => esClient.mget({ docs: mgetDocs }), {
    logger,
  });

  const versionById = new Map<string, DocumentVersion>();
  for (const doc of mgetResponse.docs) {
    if (
      'found' in doc &&
      doc.found &&
      doc._seq_no !== undefined &&
      doc._primary_term !== undefined &&
      !versionById.has(doc._id)
    ) {
      versionById.set(doc._id, {
        index: doc._index,
        seqNo: doc._seq_no,
        primaryTerm: doc._primary_term,
      });
    }
  }

  return versionById;
};

const sendBulkRequest = async <TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  request: SharedBulkRequestOptions<TExecution>,
  logger: Logger
): Promise<estypes.BulkResponse> => {
  const operations = request.items.flatMap(toBulkOperations);

  return retryTransientEsErrors(
    () =>
      esClient.bulk<TExecution, Partial<TExecution> & { id: string }>({
        refresh: request.refresh,
        operations,
      }),
    { logger }
  );
};

export async function sharedBulk<TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  request: BulkRequestOptions<TExecution>,
  logger: Logger,
  fallbackIndexes: string[] = []
): Promise<BulkResponse> {
  if (request.items.length === 0) {
    return { items: [], errors: false };
  }

  // retryOnConflicts handles the conflict-retry loop. sharedBulk passes [] for indexes
  // because it only receives BulkPlainItem — no updater items need mget resolution here.
  // return retryOnConflicts(esClient, logger, [], request, async (bulkRequest) => {
  //   // Items passed back by retryOnConflicts are the original SharedBulkItem objects
  //   // (cast to BulkPlainItem by retryOnConflicts — index is still present at runtime).
  //   const operations = (bulkRequest.items as Array<SharedBulkItem<TExecution>>).flatMap(
  //     toBulkOperations
  //   );

  //   return retryTransientEsErrors(
  //     () =>
  //       esClient.bulk<TExecution, Partial<TExecution> & { id: string }>({
  //         refresh: bulkRequest.refresh,
  //         operations,
  //       }),
  //     { logger }
  //   );
  // });

  let queuedItems: Array<QueueItem<TExecution>> = request.items.map((item, index) => ({
    item,
    originalIndex: index,
    remainingRetries: item.retryOnConflict ?? 0,
  }));

  const result = new Array<BulkItemResponse>(request.items.length);
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
        fallbackIndexes.map((index) => ({
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
            index: fallbackIndexes[0] ?? '',
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
      const esResponse = await sendBulkRequest(
        esClient,
        { ...request, items: toSend.map(({ plainItem }) => plainItem) },
        logger
      );

      // Separate conflicts into three buckets:
      // - updater-origin: re-queue original BulkUpdaterItem so the next iteration re-mgets
      // - plain OCC (seqNo set): mget fresh seqNo/primaryTerm before re-queuing
      // - plain non-OCC (no seqNo, using retry_on_conflict): re-queue unchanged
      const conflictingUpdaters: Array<QueueItem<TExecution>> = [];
      interface ConflictingPlainOcc {
        qi: QueueItem<TExecution>;
        plainItem: BulkPlainItem<TExecution>;
      }
      const conflictingOcc: ConflictingPlainOcc[] = [];
      const nextQueue: Array<QueueItem<TExecution>> = [];

      esResponse.items.forEach((esItem, idx) => {
        const { qi, plainItem } = toSend[idx];
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
          if (isBulkUpdaterItem(qi.item)) {
            conflictingUpdaters.push({ ...qi, remainingRetries: qi.remainingRetries - 1 });
          } else if (plainItem.seqNo !== undefined) {
            conflictingOcc.push({ qi, plainItem });
          } else {
            nextQueue.push({ ...qi, remainingRetries: qi.remainingRetries - 1 });
          }
        } else {
          result[qi.originalIndex] = responseItem;
          hasErrors = hasErrors || !!responseItem.error;
        }
      });

      nextQueue.push(...conflictingUpdaters);

      if (conflictingOcc.length > 0) {
        const docsToRefetch = conflictingOcc.map(({ plainItem }) => ({
          id: plainItem.document.id,
          index: plainItem.index,
        }));
        const versionById = await fetchFreshVersions(
          esClient,
          logger,
          docsToRefetch,
          fallbackIndexes
        );

        conflictingOcc.forEach(({ qi, plainItem }) => {
          const version = versionById.get(plainItem.document.id);
          nextQueue.push({
            item: version ? { ...plainItem, ...version } : plainItem,
            originalIndex: qi.originalIndex,
            remainingRetries: qi.remainingRetries - 1,
          });
        });
      }

      queuedItems = nextQueue;
    }
    // toSend empty → queuedItems already empty from splice(0) → loop exits naturally.
  }

  return { items: result, errors: hasErrors };
}
