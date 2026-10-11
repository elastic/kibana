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

import type { DataStreamMetadataManager } from './data_stream_metadata_manager';
import type { DocumentVersionManager } from './document_version_manager';

import type { SharedBulkItem } from '../../lib/bulk/shared_bulk';
import { sharedBulk } from '../../lib/bulk/shared_bulk';
import type {
  BulkItemResponse,
  BulkPlainItem,
  BulkRequestOptions,
  BulkResponse,
  BulkUpdaterItem,
  DataClient,
  DocumentVersionFields,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
} from '../../types';
import { isBulkUpdaterItem } from '../../types';

const DELETE_PAGE_SIZE = 1000;

export interface DataStreamDataClientDeps<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  versionManager: DocumentVersionManager;
  metadataManager: DataStreamMetadataManager;
  additionalIndexesToQuery?: string[];
  dateField: keyof TExecution;
  logger: Logger;
}

export class DataStreamDataClient<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  private indexesToQuery: string[] = [];
  private readonly additionalIndexesToQuery: string[] = [];

  constructor(private readonly deps: DataStreamDataClientDeps<TExecution>) {
    this.additionalIndexesToQuery = deps.additionalIndexesToQuery ?? [];
    this.indexesToQuery = [this.deps.dataStreamName, ...this.additionalIndexesToQuery];
  }

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    const searchResponse: estypes.SearchResponse<TExecution> = await this.deps.esClient.search({
      index: this.indexesToQuery,
      ...request,
      query: this.excludeDeleted(request.query),
      ignore_unavailable: true,
    });

    searchResponse.hits.hits.forEach((hit) => {
      if (hit._id && hit._source && hit._seq_no !== undefined && hit._primary_term !== undefined) {
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
    return this.deps.esClient.count({
      index: this.indexesToQuery,
      ...request,
      query: this.excludeDeleted(request.query),
      ignore_unavailable: true,
    });
  }

  public async getByIds(
    ids: string[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }

    const cachedVersions = this.deps.versionManager.bulkGetCachedVersions(ids);
    const uncachedIds = ids.filter((id) => !cachedVersions[id]);

    let backingIndexesForFallback: string[] = [];
    if (uncachedIds.length > 0) {
      const { backingIndexes } = this.deps.metadataManager.getMeta();
      backingIndexesForFallback = backingIndexes.slice(-2);
    }

    // For uncached ids, add one mget entry per backing index (last two) and
    // dedup by id taking the first found result — docs may have rolled to older indices.
    const mgetDocs: Array<{ _index: string; _id: string }> = [];

    for (const id of ids) {
      const version = cachedVersions[id];
      if (version) {
        mgetDocs.push({ _index: version.index, _id: id });
      } else {
        for (const index of backingIndexesForFallback.concat(this.additionalIndexesToQuery)) {
          mgetDocs.push({ _index: index, _id: id });
        }
      }
    }

    // mget cannot filter, so `deleted` is always read to hide soft-deleted documents.
    const sourceIncludes = options?.sourceIncludes?.length
      ? [...options.sourceIncludes, 'deleted']
      : undefined;
    const sourceExcludes = options?.sourceExcludes?.filter((field) => field !== 'deleted');

    const mgetResponse = await this.deps.esClient.mget<TExecution>({
      docs: mgetDocs,
      ...(sourceIncludes ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    const items: Array<GetExecutionByIdsItem<TExecution>> = [];
    const foundIds = new Set<string>();

    for (const doc of mgetResponse.docs) {
      if ('found' in doc && doc.found && doc._source && doc._id) {
        const docId = doc._id;
        // Soft-deleted documents are treated as missing.
        const isDeleted = (doc._source as { deleted?: unknown }).deleted === true;
        if (!isDeleted && !foundIds.has(docId)) {
          foundIds.add(docId);
          items.push({
            document: { ...doc._source, id: docId } as TExecution,
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

    const mgetMissing = ids.filter((id) => !foundIds.has(id));

    if (mgetMissing.length > 0) {
      const searchResponse = await this.search({
        query: { ids: { values: mgetMissing } },
        size: mgetMissing.length,
        seq_no_primary_term: true,
        _source_includes: options?.sourceIncludes,
        _source_excludes: options?.sourceExcludes,
      });

      for (const hit of searchResponse.hits.hits) {
        if (hit._id && hit._source) {
          foundIds.add(hit._id);
          items.push({
            document: { ...hit._source, id: hit._id } as TExecution,
            index: hit._index,
            seqNo: hit._seq_no,
            primaryTerm: hit._primary_term,
          });
        }
      }
    }

    return { items, missing: ids.filter((id) => !foundIds.has(id)) };
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    const bulkResponse = await this.privateBulk(request);

    bulkResponse.items.forEach((responseItem) => {
      if (
        !responseItem.error &&
        responseItem.seqNo !== undefined &&
        responseItem.primaryTerm !== undefined
      ) {
        this.deps.versionManager.setVersion(responseItem.id, {
          index: responseItem.index,
          seqNo: responseItem.seqNo,
          primaryTerm: responseItem.primaryTerm,
        });
      }
    });

    return bulkResponse;
  }

  public async deleteByQuery(
    _request: ExecutionsDeleteByQueryRequest
  ): Promise<estypes.DeleteByQueryResponse> {
    const startedAt = Date.now();
    let deleted = 0;
    let batches = 0;
    let versionConflicts = 0;
    const failures: estypes.BulkIndexByScrollFailure[] = [];

    // Data stream documents are soft-deleted (deleted: true), page by page. Soft-deleted
    // documents are filtered out of the next page, so the loop ends on a short page.
    let hasMore = true;
    while (hasMore) {
      const searchResponse = await this.deps.esClient.search({
        index: this.deps.dataStreamName,
        query: this.excludeDeleted(_request.query),
        size: DELETE_PAGE_SIZE,
        _source: false,
        ignore_unavailable: true,
      });
      const hits = searchResponse.hits.hits;
      if (hits.length === 0) {
        break;
      }
      batches++;

      const bulkResponse = await this.privateBulk({
        // Each page must be visible to the next search.
        refresh: true,
        items: hits.map((hit) => ({
          operation: 'update',
          document: { id: hit._id, deleted: true } as unknown as Partial<TExecution> & {
            id: string;
          },
          index: hit._index,
          retryOnConflict: 3,
        })),
      });

      let pageDeleted = 0;
      for (const item of bulkResponse.items) {
        if (!item.error) {
          pageDeleted++;
        } else {
          const isConflict = item.error.type === 'version_conflict_engine_exception';
          if (isConflict) {
            versionConflicts++;
          }
          failures.push({
            cause: item.error,
            id: item.id,
            index: item.index,
            status: isConflict ? 409 : 500,
          });
        }
      }
      deleted += pageDeleted;

      // Stop on a short page, or when nothing in the page could be deleted (no progress).
      hasMore = hits.length >= DELETE_PAGE_SIZE && pageDeleted > 0;
    }

    // Legacy plain indexes hold regular documents, which are hard-deleted.
    if (this.additionalIndexesToQuery.length > 0) {
      const legacyResponse = await this.deps.esClient.deleteByQuery({
        ..._request,
        index: this.additionalIndexesToQuery,
        ignore_unavailable: true,
      });
      deleted += legacyResponse.deleted ?? 0;
      batches += legacyResponse.batches ?? 0;
      versionConflicts += legacyResponse.version_conflicts ?? 0;
      failures.push(...(legacyResponse.failures ?? []));
    }

    return {
      deleted,
      batches,
      version_conflicts: versionConflicts,
      noops: 0,
      retries: { bulk: 0, search: 0 },
      timed_out: false,
      took: Date.now() - startedAt,
      task: '',
      failures,
    };
  }

  // Soft-deleted documents must not be visible to readers.
  private excludeDeleted(query?: estypes.QueryDslQueryContainer): estypes.QueryDslQueryContainer {
    return {
      bool: {
        ...(query ? { must: [query] } : {}),
        must_not: [{ term: { deleted: true } }],
      },
    };
  }

  private async privateBulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    if (request.items.length === 0) {
      return { items: [], errors: false };
    }

    const { backingIndexes } = this.deps.metadataManager.getMeta();
    const fallbackIndexes = backingIndexes.slice(-2).concat(this.additionalIndexesToQuery);

    const result = new Array<BulkItemResponse>(request.items.length);
    let hasErrors = false;

    const plainItemsWithIndex: Array<{ item: BulkPlainItem<TExecution>; requestIndex: number }> =
      [];
    const updaterItemsWithIndex: Array<{
      item: BulkUpdaterItem<TExecution>;
      requestIndex: number;
    }> = [];

    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      if (isBulkUpdaterItem(item)) {
        updaterItemsWithIndex.push({ item, requestIndex: i });
      } else {
        plainItemsWithIndex.push({ item, requestIndex: i });
      }
    }

    // Resolve data-stream-specific backing index, seqNo, and @timestamp for plain items.
    const { sendable, preFailed } =
      plainItemsWithIndex.length > 0
        ? await this.resolveBulkItemVersions(plainItemsWithIndex.map(({ item }) => item))
        : { sendable: [], preFailed: [] };

    preFailed.forEach(({ id, originalIndex, error }) => {
      result[plainItemsWithIndex[originalIndex].requestIndex] = { id, index: '', error };
      hasErrors = true;
    });

    // Merge resolved plain items and raw updater items for a single sharedBulk call.
    // sharedBulk handles the updater mget+callback+OCC flow internally.
    const mergedItems = [
      ...sendable.map(({ item }) => item),
      ...updaterItemsWithIndex.map(({ item }) => item),
    ];
    const mergedRequestIndexes = [
      ...sendable.map(({ originalIndex }) => plainItemsWithIndex[originalIndex].requestIndex),
      ...updaterItemsWithIndex.map(({ requestIndex }) => requestIndex),
    ];

    if (mergedItems.length > 0) {
      const bulkResponse = await sharedBulk({
        esClient: this.deps.esClient,
        request: { ...request, items: mergedItems },
        logger: this.deps.logger,
        fallbackIndexes,
        searchFallbackIndexes: this.indexesToQuery,
      });

      bulkResponse.items.forEach((responseItem, idx) => {
        result[mergedRequestIndexes[idx]] = responseItem;
        hasErrors = hasErrors || !!responseItem.error;
      });
    }

    const errors = await this.retryConflictingUpserts({
      request,
      result,
      hasErrors,
      fallbackIndexes,
    });

    return { items: result, errors };
  }

  // Upserts rewritten to create can 409 if the doc already exists. Retry those
  // as updates against the backing index named on the conflict.
  private async retryConflictingUpserts(params: {
    request: BulkRequestOptions<TExecution>;
    result: Array<BulkItemResponse>;
    hasErrors: boolean;
    fallbackIndexes: string[];
  }): Promise<boolean> {
    const { request, result, fallbackIndexes } = params;

    const upserts = new Map<string, BulkPlainItem<TExecution>>(
      request.items
        .filter(
          (item): item is BulkPlainItem<TExecution> =>
            item.operation === 'upsert' && !!item.document
        )
        .map((item) => [item.document.id, item])
    );
    if (upserts.size === 0) {
      return params.hasErrors;
    }

    const conflicted: Array<{
      requestIndex: number;
      item: BulkPlainItem<TExecution>;
    }> = [];

    result.forEach((responseItem, requestIndex) => {
      const upsert = upserts.get(responseItem.id);
      if (upsert && responseItem.error?.type === 'version_conflict_engine_exception') {
        conflicted.push({
          requestIndex,
          item: {
            ...upsert,
            operation: 'update',
            index: responseItem.index,
            retryOnConflict: 3, // Retry 3 times on conflict to ensure the document is updated.
          },
        });
      }
    });

    if (conflicted.length === 0) {
      return params.hasErrors;
    }

    const retryResponse = await sharedBulk({
      esClient: this.deps.esClient,
      request: { ...request, items: conflicted.map(({ item }) => item) },
      logger: this.deps.logger,
      fallbackIndexes,
      searchFallbackIndexes: this.indexesToQuery,
    });

    retryResponse.items.forEach((responseItem, idx) => {
      result[conflicted[idx].requestIndex] = responseItem;
    });
    return result.some((item) => !!item?.error);
  }

  // A caller-supplied seqNo/primaryTerm is compare-and-set and always wins. Otherwise the cached
  // version is used as CAS only when the item does not ask for retry_on_conflict, because ES
  // ignores retry_on_conflict when if_seq_no is present.
  private resolveWriteTarget(
    item: BulkPlainItem<TExecution>,
    version: Required<DocumentVersionFields>
  ): DocumentVersionFields {
    const index = item.index ?? version.index;

    if (item.seqNo !== undefined) {
      return { index, seqNo: item.seqNo, primaryTerm: item.primaryTerm };
    }
    if (item.operation !== 'create' && item.retryOnConflict !== undefined) {
      return { index };
    }
    return { index, seqNo: version.seqNo, primaryTerm: version.primaryTerm };
  }

  // Classifies plain items into sendable or preFailed, resolves the backing-index +
  // seqNo + primaryTerm required by data streams for CAS writes, and injects @timestamp
  // into creates and upserts that may become creates.
  //
  // originalIndex in both output arrays is the position of the item within `items`,
  // NOT a position in request.items — callers must map through plainItemsWithIndex.
  private async resolveBulkItemVersions(items: BulkPlainItem<TExecution>[]): Promise<{
    sendable: Array<{ item: SharedBulkItem<TExecution>; originalIndex: number }>;
    preFailed: Array<{ id: string; originalIndex: number; error: estypes.ErrorCause }>;
  }> {
    const sendable: Array<{ item: SharedBulkItem<TExecution>; originalIndex: number }> = [];
    const preFailed: Array<{ id: string; originalIndex: number; error: estypes.ErrorCause }> = [];
    const pendingIds = new Map<string, number>();

    // DataStream requires @timestamp to be set on create and update.
    // We inject the @timestamp into the document from the date field.
    const withTimestamp = (item: BulkPlainItem<TExecution>): BulkPlainItem<TExecution> => {
      if (!this.deps.dateField) return item;
      const ts = item.document[this.deps.dateField];
      if (typeof ts !== 'string') return item;
      return { ...item, document: { ...item.document, '@timestamp': ts } };
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i];

      if (item.operation === 'create') {
        if (this.deps.dateField && typeof item.document[this.deps.dateField] !== 'string') {
          preFailed.push({
            id: item.document.id,
            originalIndex: i,
            error: {
              type: 'illegal_argument_exception',
              reason: `data stream requires field '${String(
                this.deps.dateField
              )}' to be set on create`,
            },
          });
        } else {
          sendable.push({
            item: { ...withTimestamp(item), index: this.deps.dataStreamName },
            originalIndex: i,
          });
        }
      } else {
        // update and upsert: version must be resolved before sending.
        pendingIds.set(item.document.id, i);
      }
    }

    if (pendingIds.size > 0) {
      const versions = await this.deps.versionManager.bulkGetVersions(
        Array.from(pendingIds.keys())
      );

      for (const [id, i] of Array.from(pendingIds.entries())) {
        const version = versions[id];
        const item = items[i];

        if (version) {
          // upsert with a known version becomes an update (document exists).
          const operation = item.operation === 'upsert' ? 'update' : item.operation;
          sendable.push({
            item: { ...item, operation, ...this.resolveWriteTarget(item, version) },
            originalIndex: i,
          });
        } else {
          // No version found — document does not exist in the data stream.
          // upsert without a version becomes a create; plain update has nothing to update.
          if (item.operation === 'upsert') {
            sendable.push({
              item: {
                ...withTimestamp(item),
                operation: 'create',
                index: this.deps.dataStreamName,
              },
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
