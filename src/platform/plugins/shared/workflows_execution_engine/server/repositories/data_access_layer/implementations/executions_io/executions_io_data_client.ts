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

import { EXECUTION_IO_FALLBACK_INDEXES, WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';
import { executionIoId, parseExecutionIoId } from './execution_io_id';
import type { ExecutionIoType } from './execution_io_id';
import type { EsExecutionIo } from './types';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../constants/execution_indexes';
import type {
  BulkItemResponse,
  BulkItemResult,
  BulkResponse,
  GetExecutionsByIdsResponse,
} from '../../types';
import type { DataStreamMetadataManager } from '../data_stream/data_stream_metadata_manager';

/** IO value submitted for create. The document id is assigned by {@link ExecutionsIoDataClient.bulkCreate}. */
export type ExecutionIoCreateDocument = Omit<EsExecutionIo, 'id'>;

export interface ExecutionsIoBulkCreateRequest {
  refresh?: boolean | 'wait_for';
  documents: ExecutionIoCreateDocument[];
}

export interface ExecutionsIoDataClientDeps {
  esClient: ElasticsearchClient;
  metadataManager: DataStreamMetadataManager;
  logger: Logger;
}

/** Public IO client. Both storage bundles and the deferred wrapper implement this. */
export interface ExecutionsIoClient {
  getByIds(ids: string[]): Promise<GetExecutionsByIdsResponse<EsExecutionIo>>;
  bulkCreate(request: ExecutionsIoBulkCreateRequest): Promise<BulkResponse>;
}

interface LegacyExecutionIoSource {
  input?: EsExecutionIo['value'];
  output?: EsExecutionIo['value'];
  context?: {
    inputs?: EsExecutionIo['value'];
    output?: EsExecutionIo['value'];
  };
}

type IoHit = GetExecutionsByIdsResponse<EsExecutionIo>['items'][number];

/**
 * Reads and writes workflow and step IO on the executions IO data stream.
 * `getByIds` checks the two newest backing indexes, searches the IO data stream
 * for anything older, then the legacy plain execution indexes. Each id is created once.
 */
export class ExecutionsIoDataClient implements ExecutionsIoClient {
  constructor(private readonly deps: ExecutionsIoDataClientDeps) {}

  public async getByIds(ids: string[]): Promise<GetExecutionsByIdsResponse<EsExecutionIo>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }

    const byId = await this.readRecentBackingIndexes(ids);
    const missingIds = ids.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      const fallback = await this.readPlainIndexes(missingIds);
      for (const [id, item] of fallback) {
        byId.set(id, item);
      }
    }

    return {
      items: ids.flatMap((id) => {
        const item = byId.get(id);
        return item ? [item] : [];
      }),
      missing: ids.filter((id) => !byId.has(id)),
    };
  }

  /**
   * Creates an IO document on the data stream.
   * An id is written once. Conflicts, including ids in older backing indexes, are reported
   * per item with `errors: true`; the other documents are still written.
   */
  public async bulkCreate(request: ExecutionsIoBulkCreateRequest): Promise<BulkResponse> {
    if (request.documents.length === 0) {
      return { items: [], errors: false };
    }

    const timestamp = new Date().toISOString();
    const documents = request.documents.map((document) => ({
      ...document,
      id: executionIoId(document.type, document.executionId),
      '@timestamp': document['@timestamp'] || timestamp,
    }));
    // A data stream only enforces `_id` uniqueness in the write index, so ids that already
    // exist in older backing indexes are detected here and reported as conflicts.
    const existingIds = await this.findExistingIds(documents.map(({ id }) => id));
    const writable = documents.filter(({ id }) => !existingIds.has(id));

    const writtenById = new Map<string, BulkItemResponse>();
    if (writable.length > 0) {
      const response = await this.deps.esClient.bulk<EsExecutionIo>({
        refresh: request.refresh,
        operations: writable.flatMap((document) => [
          {
            create: {
              _index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
              _id: document.id,
            },
          },
          document,
        ]),
      });
      writable.forEach((document, index) => {
        writtenById.set(document.id, toBulkItemResponse(document.id, response.items[index]));
      });
    }

    const items = documents.map(
      (document): BulkItemResponse =>
        writtenById.get(document.id) ?? {
          id: document.id,
          index: '',
          error: {
            type: 'version_conflict_engine_exception',
            reason: 'document already exists',
          },
        }
    );
    return { items, errors: items.some((item) => item.error !== undefined) };
  }

  private async findExistingIds(ids: string[]): Promise<Set<string>> {
    const response = await this.deps.esClient.search({
      index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
      ignore_unavailable: true,
      size: ids.length,
      _source: false,
      query: { ids: { values: ids } },
    });
    return new Set(response.hits.hits.flatMap((hit) => (hit._id ? [hit._id] : [])));
  }

  /** mget the two newest IO backing indexes, then search the data stream for the rest. */
  private async readRecentBackingIndexes(ids: string[]): Promise<Map<string, IoHit>> {
    const recentIndexes = [...this.deps.metadataManager.getMeta().backingIndexes]
      .slice(-2)
      .reverse();
    const byId = new Map<string, IoHit>();
    if (recentIndexes.length === 0) {
      return byId;
    }

    const lookups = ids.flatMap((id) => recentIndexes.map((index) => ({ id, index })));
    const response = await this.deps.esClient.mget<EsExecutionIo>({
      docs: lookups.map(({ id, index }) => ({ _index: index, _id: id })),
    });

    response.docs.forEach((doc, index) => {
      const requestedId = lookups[index]?.id;
      if (!requestedId || byId.has(requestedId) || !isFoundMgetDoc(doc)) {
        return;
      }
      const parsed = parseExecutionIoId(requestedId);
      const type = doc._source.type ?? parsed?.type;
      if (!type) {
        return;
      }
      byId.set(requestedId, {
        document: {
          id: requestedId,
          executionId: parsed?.executionId ?? '',
          type,
          value: doc._source.value,
          size: doc._source.size ?? 0,
          '@timestamp': doc._source['@timestamp'] ?? '',
        },
        index: doc._index,
        seqNo: doc._seq_no,
        primaryTerm: doc._primary_term,
      });
    });

    const missingIds = ids.filter((id) => !byId.has(id));
    if (missingIds.length === 0) {
      return byId;
    }

    const searchResponse = await this.deps.esClient.search<EsExecutionIo>({
      index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
      ignore_unavailable: true,
      size: missingIds.length,
      seq_no_primary_term: true,
      query: { ids: { values: missingIds } },
    });

    searchResponse.hits.hits.forEach((hit) => {
      const id = hit._id;
      const source = hit._source;
      if (!id || !source || byId.has(id)) {
        return;
      }
      const parsed = parseExecutionIoId(id);
      const type = source.type ?? parsed?.type;
      if (!type) {
        return;
      }
      byId.set(id, {
        document: {
          id,
          executionId: source.executionId || parsed?.executionId || '',
          type,
          value: source.value,
          size: source.size ?? 0,
          '@timestamp': source['@timestamp'] ?? '',
        },
        index: hit._index ?? '',
        seqNo: hit._seq_no,
        primaryTerm: hit._primary_term,
      });
    });

    return byId;
  }

  /**
   * mget legacy plain workflow and step indexes by execution id.
   * Each execution is fetched with only the input and output fields that were requested.
   * A missing index or a failed request leaves those ids unresolved.
   */
  private async readPlainIndexes(ioIds: string[]): Promise<Map<string, IoHit>> {
    const byId = new Map<string, IoHit>();
    const parsed = ioIds.flatMap((id) => {
      const parts = parseExecutionIoId(id);
      return parts ? [{ id, ...parts }] : [];
    });
    if (parsed.length === 0) {
      return byId;
    }

    const requestedTypes = new Map<string, Set<ExecutionIoType>>();
    for (const entry of parsed) {
      const types = requestedTypes.get(entry.executionId) ?? new Set<ExecutionIoType>();
      types.add(entry.type);
      requestedTypes.set(entry.executionId, types);
    }

    const lookups = [...requestedTypes.entries()].flatMap(([executionId, types]) =>
      EXECUTION_IO_FALLBACK_INDEXES.map((index) => ({
        executionId,
        index,
        sourceIncludes: sourceIncludesFor(index, types),
      }))
    );

    let response: estypes.MgetResponse<LegacyExecutionIoSource>;
    try {
      response = await this.deps.esClient.mget<LegacyExecutionIoSource>({
        docs: lookups.map(({ executionId, index, sourceIncludes }) => ({
          _index: index,
          _id: executionId,
          _source: { includes: sourceIncludes },
        })),
      });
    } catch (error) {
      this.deps.logger.warn(
        `Failed to read legacy execution IO: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return byId;
    }

    const hitsByExecutionId = new Map<string, FoundMgetDoc<LegacyExecutionIoSource>[]>();
    response.docs.forEach((doc, index) => {
      const executionId = lookups[index]?.executionId;
      if (!executionId || !isFoundMgetDoc(doc)) {
        return;
      }
      const hits = hitsByExecutionId.get(executionId) ?? [];
      hits.push(doc);
      hitsByExecutionId.set(executionId, hits);
    });

    for (const entry of parsed) {
      const hit = (hitsByExecutionId.get(entry.executionId) ?? []).find(
        (doc) => readLegacyIo(doc._index, doc._source, entry.type) !== undefined
      );
      if (hit) {
        byId.set(entry.id, {
          document: {
            id: entry.id,
            executionId: entry.executionId,
            type: entry.type,
            value: readLegacyIo(hit._index, hit._source, entry.type),
            size: 0,
            '@timestamp': '',
          },
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    }

    return byId;
  }
}

const isWorkflowIndex = (index: string): boolean => index.includes(WORKFLOWS_EXECUTIONS_INDEX);

// Step docs keep IO at the top level; workflow docs keep it under `context` (`inputs` is plural).
function sourceIncludesFor(index: string, types: Set<ExecutionIoType>): string[] {
  const workflow = isWorkflowIndex(index);
  const includes: string[] = [];
  if (types.has('input')) {
    includes.push(workflow ? 'context.inputs' : 'input');
  }
  if (types.has('output')) {
    includes.push(workflow ? 'context.output' : 'output');
  }
  return includes;
}

function readLegacyIo(
  index: string,
  source: LegacyExecutionIoSource,
  type: ExecutionIoType
): EsExecutionIo['value'] | undefined {
  if (isWorkflowIndex(index)) {
    return type === 'input' ? source.context?.inputs : source.context?.output;
  }
  return source[type];
}

type FoundMgetDoc<TSource> = estypes.GetGetResult<TSource> & {
  found: true;
  _source: TSource;
};

function isFoundMgetDoc<TSource>(
  doc: estypes.MgetResponseItem<TSource>
): doc is FoundMgetDoc<TSource> {
  return 'found' in doc && doc.found === true && doc._source != null && typeof doc._id === 'string';
}

function toBulkItemResponse(
  id: string,
  esItem: estypes.BulkResponse['items'][number] | undefined
): BulkItemResponse {
  const esResult = esItem?.update ?? esItem?.create ?? esItem?.index;
  if (!esResult) {
    return {
      id,
      index: '',
      error: { type: 'unknown_error', reason: 'Missing bulk response item' },
    };
  }

  return {
    id: esResult._id ?? id,
    error: esResult.error,
    index: esResult._index,
    seqNo: esResult._seq_no,
    primaryTerm: esResult._primary_term,
    result: esResult.result as BulkItemResult | undefined,
  };
}
