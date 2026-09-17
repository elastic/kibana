/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  QueryDslQueryContainer,
  SearchResponse,
  SortResults,
} from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';
import { MAX_RUN_WORKFLOW_DOCS } from '@kbn/workflows';
import type { DocumentSelection } from '../../../../../common/types/document_types';

/** A raw document hit shared by both the id-based and query-based fetch paths. */
export interface RawDocumentHit {
  _id: string;
  _index: string;
  _source: Record<string, unknown>;
}

interface FetchByQueryParams {
  query: QueryDslQueryContainer;
  index: string | string[];
  /** Upper bound on how many documents to expand. Defaults to `MAX_TRIGGER_EVENT_DOCS`. */
  maxDocs?: number;
  /** Upper bound on accumulated document source bytes. Defaults to `MAX_TRIGGER_EVENT_BYTES`. */
  maxBytes?: number;
  /** Number of documents to request per page. Defaults to `SEARCH_PAGE_SIZE`. */
  pageSize?: number;
}

interface FetchByQueryResult {
  hits: RawDocumentHit[];
  /** Total number of documents matching the query (may exceed `hits.length`). */
  total: number;
  /** True when `total` exceeded `maxDocs` and the result was capped. */
  truncated: boolean;
}

/**
 * Default cap on how many documents/alerts a single trigger selection will expand.
 * Bounds server memory and the persisted execution event size. Re-exported from the shared
 * `@kbn/workflows` constant so the enforced limit and the UI's "first N" message stay in sync.
 */
export const MAX_TRIGGER_EVENT_DOCS = MAX_RUN_WORKFLOW_DOCS;
export const MAX_TRIGGER_EVENT_BYTES = 10 * 1024 * 1024;

const SEARCH_PAGE_SIZE = 1000;
const PIT_KEEP_ALIVE = '1m';

const getDocumentSourceBytes = (source: Record<string, unknown>): number =>
  Buffer.byteLength(JSON.stringify(source), 'utf8');

const createSizeLimitError = (maxBytes: number): Error =>
  new Error(`Trigger event document sources exceed the ${maxBytes} byte limit`);

/**
 * Fetches full document sources for an explicit id selection via a single `mget`.
 * Not-found ids are skipped (and logged); the caller decides how to handle an empty result.
 */
export async function fetchDocumentsByIds(
  ids: DocumentSelection[],
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<RawDocumentHit[]> {
  if (ids.length === 0) {
    return [];
  }

  if (ids.length > MAX_TRIGGER_EVENT_DOCS) {
    throw new Error(
      `Trigger event selection cannot contain more than ${MAX_TRIGGER_EVENT_DOCS} document IDs`
    );
  }

  try {
    const response = await esClient.mget<Record<string, unknown>>(
      {
        docs: ids.map(({ _id, _index }) => ({ _id, _index })),
      },
      { maxResponseSize: MAX_TRIGGER_EVENT_BYTES }
    );

    const hits: RawDocumentHit[] = [];
    for (let i = 0; i < response.docs.length; i++) {
      const doc = response.docs[i];
      if ('found' in doc && doc.found && '_source' in doc && doc._source) {
        hits.push({
          _id: doc._id,
          _index: doc._index,
          _source: doc._source as Record<string, unknown>,
        });
      } else {
        logger.warn(`Document not found: ${ids[i]._id} in index ${ids[i]._index}`);
      }
    }
    return hits;
  } catch (error) {
    logger.error(
      `Failed to fetch documents by ids: ${error instanceof Error ? error.message : String(error)}`
    );
    throw error;
  }
}

/**
 * Expands a query-based selection into document sources using a point in time and a
 * `search_after` loop, stopping once `maxDocs` is reached. This lets a caller select
 * thousands of documents by sending only the query, avoiding the request payload and
 * result-window limits that a client-side id enumeration would hit.
 */
export async function fetchDocumentsByQuery(
  params: FetchByQueryParams,
  esClient: ElasticsearchClient,
  logger: Logger
): Promise<FetchByQueryResult> {
  const { query, index } = params;
  const maxDocs = params.maxDocs ?? MAX_TRIGGER_EVENT_DOCS;
  const maxBytes = params.maxBytes ?? MAX_TRIGGER_EVENT_BYTES;
  const maxPageSize = params.pageSize ?? SEARCH_PAGE_SIZE;
  const hits: RawDocumentHit[] = [];
  let sourceBytes = 0;
  let scannedHits = 0;
  let total = 0;
  let pitId: string | undefined;

  try {
    const pitResponse = await esClient.openPointInTime({ index, keep_alive: PIT_KEEP_ALIVE });
    pitId = pitResponse.id;

    let searchAfter: SortResults | undefined;
    while (scannedHits < maxDocs) {
      if (!pitId) {
        break;
      }
      const pageSize = Math.min(maxPageSize, maxDocs - scannedHits);
      const response: SearchResponse<Record<string, unknown>> = await esClient.search<
        Record<string, unknown>
      >(
        {
          query,
          size: pageSize,
          allow_partial_search_results: false,
          track_total_hits: searchAfter === undefined,
          // Newest first, so a capped selection keeps the most recent docs. `_shard_doc` is a
          // stable tiebreaker only available with a point in time.
          sort: [{ '@timestamp': { order: 'desc', unmapped_type: 'date' } }, { _shard_doc: 'asc' }],
          pit: { id: pitId, keep_alive: PIT_KEEP_ALIVE },
          ...(searchAfter ? { search_after: searchAfter } : {}),
        },
        { maxResponseSize: maxBytes }
      );

      // A point-in-time ID may change between requests; use the freshest one, including when
      // rejecting an incomplete response, so the finally block closes the active context.
      if (response.pit_id) {
        pitId = response.pit_id;
      }

      if (response.timed_out || (response._shards?.failed ?? 0) > 0) {
        throw new Error(
          `Incomplete document query response (timed_out=${
            response.timed_out ?? false
          }, shards_failed=${response._shards?.failed ?? 0})`
        );
      }

      const totalHits = response.hits.total;
      total = typeof totalHits === 'number' ? totalHits : totalHits?.value ?? total;

      const pageHits = response.hits.hits;
      if (pageHits.length === 0) {
        break;
      }

      for (const hit of pageHits) {
        scannedHits++;
        if (hit._source) {
          const hitSourceBytes = getDocumentSourceBytes(hit._source);
          if (sourceBytes + hitSourceBytes > maxBytes) {
            throw createSizeLimitError(maxBytes);
          }
          sourceBytes += hitSourceBytes;
          hits.push({
            _id: hit._id as string,
            _index: hit._index,
            _source: hit._source as Record<string, unknown>,
          });
        }
      }

      const lastHit = pageHits[pageHits.length - 1];
      searchAfter = lastHit.sort;
      if (pageHits.length < pageSize || !searchAfter) {
        break;
      }
    }

    return { hits, total, truncated: total > scannedHits };
  } catch (error) {
    logger.error(
      `Failed to fetch documents by query: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw error;
  } finally {
    if (pitId) {
      try {
        await esClient.closePointInTime({ id: pitId });
      } catch (error) {
        logger.warn(
          `Failed to close point in time: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }
}
