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
import type {
  BulkOperation,
  QueueItem,
  Sendable,
  Settled,
  SharedBulkItem,
  SharedBulkRequestOptions,
  UpdaterSource,
} from './types';
import {
  type BulkItemResponse,
  type BulkItemResult,
  type BulkPlainItem,
  type BulkRequestOptions,
  type BulkResponse,
  type BulkUpdaterItem,
  isBulkUpdaterItem,
} from '../../types';

export type { SharedBulkItem, SharedBulkRequestOptions } from './types';

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

const sendBulkRequest = async <TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  request: SharedBulkRequestOptions<TExecution>,
  logger: Logger
): Promise<estypes.BulkResponse> => {
  const operations = request.items.flatMap(toBulkOperations);

  return esClient.bulk<TExecution, Partial<TExecution> & { id: string }>({
    refresh: request.refresh,
    operations,
  });
};

const refreshWrittenIndexes = async (
  esClient: ElasticsearchClient,
  refresh: BulkRequestOptions<{ id: string }>['refresh'],
  result: Array<BulkItemResponse | undefined>
): Promise<void> => {
  // `wait_for` is forwarded on the ES bulk itself. Only `true` is deferred so
  // OCC retry rounds do not force-refresh after every 409.
  if (refresh !== true) {
    return;
  }

  const indexes = Array.from(
    new Set(
      result
        .filter((item) => item?.result === 'updated' || item?.result === 'created')
        .map((item) => item?.index)
        .filter((index): index is string => typeof index === 'string' && index.length > 0)
    )
  );

  if (indexes.length === 0) {
    return;
  }

  await esClient.indices.refresh({ index: indexes });
};

const mgetUpdaterSources = async <TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  updaterBatch: Array<QueueItem<TExecution> & { item: BulkUpdaterItem<TExecution> }>,
  fallbackIndexes: string[],
  searchFallbackIndexes: string[]
): Promise<Map<string, UpdaterSource<TExecution>>> => {
  const foundById = new Map<string, UpdaterSource<TExecution>>();
  const errorById = new Map<string, estypes.ErrorCause>();
  // Each updater item × each index — first found result per id wins.
  if (updaterBatch.length === 0) {
    return foundById;
  }

  // Several updaters may target one id with different projections. Coalesce them into a single
  // read per id so each updater sees (at least) the fields it asked for. An empty projection
  // means the full source, which wins over any narrower one.
  const projectionById = new Map<string, Set<string> | null>();
  for (const { item } of updaterBatch) {
    const existing = projectionById.get(item.documentId);
    if (existing !== null) {
      if (item.sourceFields.length === 0) {
        projectionById.set(item.documentId, null);
      } else {
        const fields = existing ?? new Set<string>();
        item.sourceFields.forEach((field) => fields.add(field));
        projectionById.set(item.documentId, fields);
      }
    }
  }

  const mgetDocs = Array.from(projectionById).flatMap(([documentId, fields]) =>
    fallbackIndexes.map((index) => ({
      _id: documentId,
      _index: index,
      ...(fields ? { _source: { includes: Array.from(fields) } } : {}),
    }))
  );

  const mgetResponse = await esClient.mget<TExecution>({ docs: mgetDocs });

  for (const doc of mgetResponse.docs) {
    if (
      'found' in doc &&
      doc.found &&
      doc._source &&
      doc._id &&
      doc._seq_no !== undefined &&
      doc._primary_term !== undefined &&
      !foundById.has(doc._id)
    ) {
      // `_source.includes` can omit `id`; updaters and callers key by document.id.
      foundById.set(doc._id, {
        source: { ...doc._source, id: doc._id } as TExecution,
        seqNo: doc._seq_no,
        primaryTerm: doc._primary_term,
        index: doc._index,
      });
    } else if ('error' in doc && doc.error && doc._id && !errorById.has(doc._id)) {
      errorById.set(doc._id, doc.error);
    }
  }

  // A per-document MGET error is a storage failure, not a missing document. Only surface it
  // when no other index returned the document.
  for (const [id, error] of errorById) {
    if (!foundById.has(id)) {
      throw new Error(`Bulk updater source read failed for ${id}: ${JSON.stringify(error)}`);
    }
  }

  // Documents may have rolled out of the indexes mget covered (e.g. older data stream backing
  // indexes), so look the remaining ids up with a search across the whole target.
  const missingIds = Array.from(projectionById.keys()).filter((id) => !foundById.has(id));
  if (searchFallbackIndexes.length > 0 && missingIds.length > 0) {
    const missingProjections = missingIds.map((id) => projectionById.get(id));
    // One search for all ids, so use the full source unless every projection is narrow.
    const includes = missingProjections.some((fields) => !fields)
      ? undefined
      : Array.from(new Set(missingProjections.flatMap((fields) => Array.from(fields ?? []))));

    const searchResponse = await esClient.search<TExecution>({
      index: searchFallbackIndexes,
      query: { ids: { values: missingIds } },
      size: missingIds.length,
      seq_no_primary_term: true,
      ignore_unavailable: true,
      ...(includes ? { _source: { includes } } : {}),
    });

    for (const hit of searchResponse.hits.hits) {
      if (
        hit._id &&
        hit._source &&
        hit._seq_no !== undefined &&
        hit._primary_term !== undefined &&
        !foundById.has(hit._id)
      ) {
        foundById.set(hit._id, {
          source: { ...hit._source, id: hit._id } as TExecution,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
          index: hit._index,
        });
      }
    }
  }

  return foundById;
};

const resolveBatchToSend = <TExecution extends { id: string }>(
  batch: Array<QueueItem<TExecution>>,
  foundById: Map<string, UpdaterSource<TExecution>>,
  fallbackIndexes: string[]
): { toSend: Array<Sendable<TExecution>>; settled: Settled[] } => {
  const toSend: Array<Sendable<TExecution>> = [];
  const settled: Settled[] = [];

  for (const qi of batch) {
    if (isBulkUpdaterItem(qi.item)) {
      const updaterItem = qi.item;
      const found = foundById.get(updaterItem.documentId);

      if (!found) {
        settled.push({
          originalIndex: qi.originalIndex,
          response: {
            id: updaterItem.documentId,
            index: fallbackIndexes[0] ?? '',
            error: {
              type: 'document_missing_exception',
              reason: `[_doc][${updaterItem.documentId}]: document missing`,
            },
          },
        });
      } else {
        const patch = updaterItem.updater(
          found.source as Pick<TExecution, keyof TExecution & string>
        );

        if (patch === 'noop') {
          settled.push({
            originalIndex: qi.originalIndex,
            response: {
              id: updaterItem.documentId,
              index: found.index,
              seqNo: found.seqNo,
              primaryTerm: found.primaryTerm,
              result: 'noop',
            },
          });
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

  return { toSend, settled };
};

const requeueConflicts = <TExecution extends { id: string }>(
  toSend: Array<Sendable<TExecution>>,
  esResponse: estypes.BulkResponse
): { nextQueue: Array<QueueItem<TExecution>>; settled: Settled[] } => {
  const toBulkItemResponse = (esItem: estypes.BulkResponse['items'][number]): BulkItemResponse => {
    const esResult = esItem.create ?? esItem.index ?? esItem.update;
    if (!esResult?._id) {
      throw new Error(`Unexpected bulk response item without _id: ${JSON.stringify(esItem)}`);
    }

    return {
      id: esResult._id,
      error: esResult.error,
      index: esResult._index,
      seqNo: esResult._seq_no,
      primaryTerm: esResult._primary_term,
      result: esResult.result as BulkItemResult | undefined,
    };
  };

  // Updater items re-queue so the next iteration re-mgets and re-runs the callback.
  // Plain items settle. retry_on_conflict is Elasticsearch's budget and is not also retried here.
  // Caller-supplied seqNo is compare-and-set: a 409 must surface, never be retried.
  const nextQueue: Array<QueueItem<TExecution>> = [];
  const settled: Settled[] = [];

  esResponse.items.forEach((esItem, idx) => {
    const { qi } = toSend[idx];
    const responseItem = toBulkItemResponse(esItem);
    const isConflict = responseItem.error?.type === 'version_conflict_engine_exception';
    const canRetryConflict = isConflict && qi.remainingRetries > 0 && isBulkUpdaterItem(qi.item);

    if (canRetryConflict) {
      nextQueue.push({ ...qi, remainingRetries: qi.remainingRetries - 1 });
    } else {
      settled.push({ originalIndex: qi.originalIndex, response: responseItem });
    }
  });

  return { nextQueue, settled };
};

const applySettled = (
  result: Array<BulkItemResponse>,
  settled: Settled[],
  hasErrors: boolean
): boolean => {
  let nextHasErrors = hasErrors;
  for (const { originalIndex, response } of settled) {
    result[originalIndex] = response;
    nextHasErrors = nextHasErrors || !!response.error;
  }
  return nextHasErrors;
};

export async function sharedBulk<TExecution extends { id: string }>(params: {
  esClient: ElasticsearchClient;
  request: BulkRequestOptions<TExecution>;
  logger: Logger;
  fallbackIndexes: string[];
  /** When set, updater sources missing from the mget are searched for across these indexes. */
  searchFallbackIndexes?: string[];
}): Promise<BulkResponse> {
  const { esClient, request, logger } = params;
  const fallbackIndexes: string[] = params.fallbackIndexes ?? [];
  const searchFallbackIndexes: string[] = params.searchFallbackIndexes ?? [];

  if (request.items.length === 0) {
    return { items: [], errors: false };
  }

  let queuedItems: Array<QueueItem<TExecution>> = request.items.map((item, index) => ({
    item,
    originalIndex: index,
    remainingRetries: isBulkUpdaterItem(item) ? item.retryOnConflict ?? 0 : 0,
  }));

  const result = new Array<BulkItemResponse>(request.items.length);
  let hasErrors = false;

  while (queuedItems.length > 0) {
    const batch = queuedItems.splice(0);

    const updaterBatch = batch.filter(
      (qi): qi is QueueItem<TExecution> & { item: BulkUpdaterItem<TExecution> } =>
        isBulkUpdaterItem(qi.item)
    );
    const foundById = await mgetUpdaterSources(
      esClient,
      updaterBatch,
      fallbackIndexes,
      searchFallbackIndexes
    );
    const { toSend, settled: resolvedSettled } = resolveBatchToSend(
      batch,
      foundById,
      fallbackIndexes
    );
    hasErrors = applySettled(result, resolvedSettled, hasErrors);

    if (toSend.length > 0) {
      const esResponse = await sendBulkRequest(
        esClient,
        {
          ...request,
          refresh: request.refresh === 'wait_for' ? 'wait_for' : undefined,
          items: toSend.map(({ plainItem }) => plainItem),
        },
        logger
      );
      const { nextQueue, settled: conflictSettled } = requeueConflicts(toSend, esResponse);
      hasErrors = applySettled(result, conflictSettled, hasErrors);
      queuedItems = nextQueue;
    }
  }

  await refreshWrittenIndexes(esClient, request.refresh, result);

  return { items: result, errors: hasErrors };
}
