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

import type { DocumentVersionManager } from './document_version_manager';
import { retryTransientEsErrors } from '../../../../lib/retry_transient_es_errors';

import type { SharedBulkItem } from '../../lib/shared_bulk';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkItem,
  BulkItemResponse,
  BulkRequestOptions,
  BulkResponse,
  DataClient,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
} from '../../types';

const notImplemented = (method: string): never => {
  throw new Error(`DataStreamDataClient.${method} is not implemented`);
};

export interface DataStreamDataClientDeps<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  versionManager: DocumentVersionManager;
  additionalIndexesToQuery?: string[];
  dateField: keyof TExecution;
  logger: Logger;
}

export class DataStreamDataClient<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  private additionalIndexesToQuery: string[];

  constructor(private readonly deps: DataStreamDataClientDeps<TExecution>) {
    this.additionalIndexesToQuery = deps.additionalIndexesToQuery ?? [];
  }

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    const searchResponse: estypes.SearchResponse<TExecution> = await retryTransientEsErrors(
      () =>
        this.deps.esClient.search({
          index: [this.deps.dataStreamName, ...this.additionalIndexesToQuery],
          ...request,
          ignore_unavailable: true,
        }),
      { logger: this.deps.logger }
    );

    searchResponse.hits.hits.forEach((hit) => {
      if (hit._id && hit?._source && hit._seq_no !== undefined && hit._primary_term !== undefined) {
        this.deps.versionManager.setVersion(hit._id, {
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    });
    return searchResponse;
  }

  public async count(request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return retryTransientEsErrors(
      () =>
        this.deps.esClient.count({
          index: this.deps.dataStreamName,
          ...request,
        }),
      { logger: this.deps.logger }
    );
  }

  public async getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }

    const stringIds = ids.filter((id): id is string => typeof id === 'string');
    const cachedVersions =
      stringIds.length > 0 ? this.deps.versionManager.bulkGetCachedVersions(stringIds) : {};
    const uncachedStringIds = stringIds.filter((id) => !cachedVersions[id]);

    let backingIndexesForFallback: string[] = [];
    if (uncachedStringIds.length > 0) {
      const { backingIndexes } = await this.deps.versionManager.getMeta();
      backingIndexesForFallback = backingIndexes.slice(-2);
    }

    // For uncached string ids, add one mget entry per backing index (last two) and
    // dedup by id taking the first found result — docs may have rolled to older indices.
    const mgetDocs: Array<{ _index: string; _id: string }> = [];
    for (const id of ids) {
      if (typeof id !== 'string') {
        mgetDocs.push({ _index: id.index, _id: id.id });
      } else {
        const version = cachedVersions[id];
        if (version) {
          mgetDocs.push({ _index: version.index, _id: id });
        } else {
          for (const index of backingIndexesForFallback) {
            mgetDocs.push({ _index: index, _id: id });
          }
        }
      }
    }

    const mgetResponse = await retryTransientEsErrors(
      () =>
        this.deps.esClient.mget<TExecution>({
          docs: mgetDocs,
          ...(options?.sourceIncludes?.length ? { _source_includes: options.sourceIncludes } : {}),
          ...(options?.sourceExcludes?.length ? { _source_excludes: options.sourceExcludes } : {}),
        }),
      { logger: this.deps.logger }
    );

    const items: Array<GetExecutionByIdsItem<TExecution>> = [];
    const foundIds = new Set<string>();

    for (const doc of mgetResponse.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const docId = doc._id;
        if (!foundIds.has(docId)) {
          foundIds.add(docId);
          items.push({
            document: doc._source as TExecution,
            index: doc._index,
            seqNo: doc._seq_no,
            primaryTerm: doc._primary_term,
          });
          if (doc._seq_no !== undefined && doc._primary_term !== undefined) {
            this.deps.versionManager.setVersion(docId, {
              index: doc._index,
              seqNo: doc._seq_no,
              primaryTerm: doc._primary_term,
            });
          }
        }
      }
    }

    const allIds = ids.map((id) => (typeof id === 'string' ? id : id.id));
    const mgetMissing = allIds.filter((id) => !foundIds.has(id));

    if (mgetMissing.length > 0) {
      const searchResponse = await this.search({
        query: { ids: { values: mgetMissing } },
        size: mgetMissing.length,
        _source_includes: options?.sourceIncludes,
        _source_excludes: options?.sourceExcludes,
      });

      for (const hit of searchResponse.hits.hits) {
        if (hit._id && hit._source) {
          foundIds.add(hit._id);
          items.push({
            document: hit._source as TExecution,
            index: hit._index,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          });
        }
      }
    }

    return { items, missing: allIds.filter((id) => !foundIds.has(id)) };
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    if (request.items.length === 0) {
      return { items: [], errors: false };
    }

    // Data streams require @timestamp on every document. Derive it from the item's
    // dateField (createdAt for workflow executions, startedAt for step executions).
    const itemsWithTimestamp = await this.assignTimestampToItems(request.items);

    // Tracks an item through retries. originalIndex is its position in request.items
    // so results can be written back to the correct slot regardless of retries.
    // remainingRetries mirrors the caller's retryOnConflict budget per item.
    interface RetryableItem {
      item: SharedBulkItem<TExecution>;
      originalIndex: number;
      remainingRetries: number;
    }

    const result = new Array<BulkItemResponse>(request.items.length);
    let hasErrors = false;

    const queue: RetryableItem[] = itemsWithTimestamp.map((item, index) => ({
      item,
      originalIndex: index,
      remainingRetries: item.retryOnConflict ?? 0,
    }));

    // On the first pass use the version cache; on retries bypass the cache so we
    // always send the seqNo/primaryTerm that ES just wrote.
    let fetchFreshVersions = false;

    while (queue.length > 0) {
      // Drain the queue into an immutable batch for this iteration. Any items that
      // need retrying are pushed back to queue at the end of the loop.
      const batch = queue.splice(0);

      // resolveBulkItemVersions attaches the backing-index + seqNo + primaryTerm
      // required by data streams for update/upsert operations. Items whose version
      // cannot be found become preFailed (update) or are converted to create (upsert).
      const { sendable, preFailed } = await this.resolveBulkItemVersions(
        batch.map(({ item }) => item),
        fetchFreshVersions
      );

      const esResponse = await sharedBulk(
        this.deps.esClient,
        { ...request, items: sendable.map(({ item }) => item) },
        this.deps.logger
      );

      const conflicting: RetryableItem[] = [];

      // esResponse.items maps 1:1 to sendable (not to batch). Use sendable[idx].originalIndex
      // to get the correct batch entry — they diverge when preFailed items are present.
      esResponse.items.forEach((responseItem, idx) => {
        const pending = batch[sendable[idx].originalIndex];
        const isConflict = responseItem.error?.type === 'version_conflict_engine_exception';

        if (isConflict && pending.remainingRetries > 0) {
          // Re-queue with a decremented budget. The next iteration will fetch a
          // fresh seqNo/primaryTerm before retrying.
          conflicting.push({ ...pending, remainingRetries: pending.remainingRetries - 1 });
        } else {
          if (responseItem.seqNo !== undefined && responseItem.primaryTerm !== undefined) {
            this.deps.versionManager.setVersion(responseItem.id, {
              index: responseItem.index,
              seqNo: responseItem.seqNo,
              primaryTerm: responseItem.primaryTerm,
            });
          }
          result[pending.originalIndex] = responseItem;
          hasErrors = hasErrors || !!responseItem.error;
        }
      });

      // preFailed.originalIndex is batch-relative; batch[originalIndex].originalIndex
      // maps it back to the original request position.
      preFailed.forEach(({ id, originalIndex, error }) => {
        result[batch[originalIndex].originalIndex] = { id, error, index: '' };
      });

      if (conflicting.length > 0) {
        queue.push(...conflicting);
      }

      fetchFreshVersions = true;
    }

    return { items: result, errors: hasErrors };
  }

  public async scriptUpdate(_request: ScriptUpdateRequest): Promise<ScriptUpdateResponse> {
    return notImplemented('scriptUpdate');
  }

  public async deleteByQuery(
    _request: ExecutionsDeleteByQueryRequest
  ): Promise<estypes.DeleteByQueryResponse> {
    return notImplemented('deleteByQuery');
  }

  private async assignTimestampToItems(
    items: BulkItem<TExecution>[]
  ): Promise<BulkItem<TExecution>[]> {
    if (!this.deps.dateField) {
      return items;
    }

    return items.map((item) => {
      const timestampValue = item.document[this.deps.dateField];

      if (typeof timestampValue !== 'string') {
        return item;
      }

      return {
        ...item,
        document: {
          ...item.document,
          ...(timestampValue ? { '@timestamp': timestampValue } : {}),
        },
      };
    });
  }

  // Classifies each item into sendable or preFailed and attaches the version info
  // (backing index + seqNo + primaryTerm) required by data streams for CAS writes.
  //
  // originalIndex in both output arrays is the position of the item within `items`,
  // NOT a position in request.items — callers must map through batch[] to get the
  // true request position.
  //
  // `fresh` controls whether version resolution bypasses the in-memory cache:
  //   false — first pass, use cache then fall back to ES on misses (bulkGetVersions)
  //   true  — retry pass, always fetch from ES to get the latest seqNo (bulkGetFreshVersions)
  private async resolveBulkItemVersions(
    items: BulkItem<TExecution>[],
    fresh: boolean
  ): Promise<{
    sendable: Array<{ item: SharedBulkItem<TExecution>; originalIndex: number }>;
    preFailed: Array<{ id: string; originalIndex: number; error: estypes.ErrorCause }>;
  }> {
    const sendable: Array<{ item: SharedBulkItem<TExecution>; originalIndex: number }> = [];
    const preFailed: Array<{ id: string; originalIndex: number; error: estypes.ErrorCause }> = [];
    const pendingIds = new Map<string, number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.operation === 'create') {
        // Creates always target the write index; no version needed.
        sendable.push({ item: { ...item, index: this.deps.dataStreamName }, originalIndex: i });
      } else if (item.index && item.seqNo !== undefined && item.primaryTerm !== undefined) {
        // Caller already supplied explicit version info — send as-is.
        sendable.push({ item: { ...item }, originalIndex: i });
      } else {
        // Version must be resolved from cache or ES before this item can be sent.
        pendingIds.set(item.document.id, i);
      }
    }

    if (pendingIds.size > 0) {
      const versions = fresh
        ? await this.deps.versionManager.bulkGetFreshVersions(Array.from(pendingIds.keys()))
        : await this.deps.versionManager.bulkGetVersions(Array.from(pendingIds.keys()));

      for (const [id, i] of pendingIds) {
        const version = versions[id];

        if (version) {
          // upsert with a known version becomes an update (document exists).
          const operation = items[i].operation === 'upsert' ? 'update' : items[i].operation;
          sendable.push({
            item: { ...items[i], operation, ...version },
            originalIndex: i,
          });
        } else {
          // No version found — document does not exist in the data stream.
          // upsert without a version becomes a create; plain update has nothing to update.
          const item = items[i];

          if (item.operation === 'upsert') {
            sendable.push({
              item: { ...item, operation: 'create', index: this.deps.dataStreamName },
              originalIndex: i,
            });
          } else {
            preFailed.push({
              id,
              originalIndex: i,
              error: {
                type: 'document_missing_exception',
                reason: `[_doc][${id}]: document missing`,
              },
            });
          }
        }
      }
    }

    return { sendable, preFailed };
  }
}
