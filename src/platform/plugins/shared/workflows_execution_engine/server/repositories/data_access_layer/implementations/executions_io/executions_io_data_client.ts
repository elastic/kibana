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
import { executionIoId, type ExecutionIoType, parseExecutionIoId } from '@kbn/workflows/server';

import { EXECUTION_IO_FALLBACK_INDEXES, WORKFLOWS_EXECUTIONS_IO_DATA_STREAM } from './constants';
import type { EsExecutionIo } from './types';
import { WORKFLOWS_EXECUTIONS_INDEX } from '../../constants/execution_indexes';
import type {
  BulkItemResponse,
  BulkItemResult,
  BulkResponse,
  GetExecutionsByIdsResponse,
} from '../../types';
import type { DataStreamMetadataManager } from '../data_stream/data_stream_metadata_manager';

/**
 * IO value submitted for create.
 * {@link ExecutionsIoDataClient.bulkCreate} assigns the document id and stamps `@timestamp` when it is omitted.
 */
export type ExecutionIoCreateDocument = Omit<EsExecutionIo, 'id' | '@timestamp'> & {
  '@timestamp'?: string;
};

export interface ExecutionsIoBulkCreateRequest {
  refresh?: boolean | 'wait_for';
  documents: ExecutionIoCreateDocument[];
}

type IdentifiedExecutionIoDocument = ExecutionIoCreateDocument & { id: string };

export interface ExecutionsIoDataClientDeps {
  esClient: ElasticsearchClient;
  metadataManager: DataStreamMetadataManager;
  logger: Logger;
}

/** Optional `_source` filter for {@link ExecutionsIoClient.getByIds}. */
export interface GetExecutionsIoByIdsOptions {
  sourceIncludes?: string[];
}

/** Public IO client. Both storage bundles and the deferred wrapper implement this. */
export interface ExecutionsIoClient {
  getByIds(
    ids: string[],
    options?: GetExecutionsIoByIdsOptions
  ): Promise<GetExecutionsByIdsResponse<EsExecutionIo>>;
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
 * for anything older, then the legacy plain execution indexes. A create the write
 * index rejects because the id already exists updates `value` and `size` there.
 */
export class ExecutionsIoDataClient implements ExecutionsIoClient {
  constructor(private readonly deps: ExecutionsIoDataClientDeps) {}

  public async getByIds(
    ids: string[],
    options?: GetExecutionsIoByIdsOptions
  ): Promise<GetExecutionsByIdsResponse<EsExecutionIo>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }

    const sourceIncludes = options?.sourceIncludes?.filter((field) => field.length > 0);
    const byId = await this.readRecentBackingIndexes(ids, sourceIncludes);
    const missingIds = ids.filter((id) => !byId.has(id));
    if (missingIds.length > 0) {
      const fallback = await this.readPlainIndexes(missingIds, sourceIncludes);
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
   * Creates IO documents on the data stream.
   * A write-index conflict is updated in the backing index that holds the id.
   * Other documents in the request are still created. Per-item errors stay on the response.
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

    const response = await this.deps.esClient.bulk<EsExecutionIo>({
      refresh: request.refresh,
      operations: documents.flatMap((document) => [
        {
          create: {
            _index: WORKFLOWS_EXECUTIONS_IO_DATA_STREAM,
            _id: document.id,
          },
        },
        document,
      ]),
    });

    const writtenById = new Map<string, BulkItemResponse>();
    documents.forEach((document, index) => {
      writtenById.set(document.id, toBulkItemResponse(document.id, response.items[index]));
    });

    // Step inputs are still rewritten after the first write. Overwrite the
    // existing IO document until those writes move to step state.
    // https://github.com/elastic/security-team/issues/20687
    await this.updateConflictingDocs(documents, writtenById, request.refresh);

    const items = documents.map(
      (document): BulkItemResponse =>
        writtenById.get(document.id) ?? {
          id: document.id,
          index: '',
          error: { type: 'unknown_error', reason: 'Missing bulk response item' },
        }
    );
    return { items, errors: items.some((item) => item.error !== undefined) };
  }

  private async updateConflictingDocs(
    documents: IdentifiedExecutionIoDocument[],
    writtenById: Map<string, BulkItemResponse>,
    refresh: ExecutionsIoBulkCreateRequest['refresh']
  ): Promise<void> {
    const conflicts = documents.filter(
      (document) =>
        writtenById.get(document.id)?.error?.type === 'version_conflict_engine_exception'
    );
    if (conflicts.length === 0) {
      return;
    }

    // A data stream only rejects the create when the id is already in the write
    // index, and that bulk item names the index. getByIds can miss it.
    const located = new Map(
      conflicts.flatMap((document) => {
        const index = writtenById.get(document.id)?.index;
        return index ? [[document.id, index] as const] : [];
      })
    );
    const updated = await this.updateDocuments(conflicts, located, refresh);
    conflicts.forEach((document, index) => {
      const item = updated[index];
      if (item) {
        writtenById.set(document.id, item);
      }
    });
  }

  private async updateDocuments(
    documents: IdentifiedExecutionIoDocument[],
    indexById: ReadonlyMap<string, string>,
    refresh: ExecutionsIoBulkCreateRequest['refresh']
  ): Promise<BulkItemResponse[]> {
    const items = new Array<BulkItemResponse>(documents.length);
    const targets: Array<{
      position: number;
      document: IdentifiedExecutionIoDocument;
      index: string;
    }> = [];
    documents.forEach((document, position) => {
      const index = indexById.get(document.id);
      if (!index) {
        items[position] = {
          id: document.id,
          index: '',
          error: { type: 'document_missing_exception', reason: 'document not found' },
        };
        return;
      }
      targets.push({ position, document, index });
    });

    if (targets.length === 0) {
      return items;
    }

    const response = await this.deps.esClient.bulk<
      EsExecutionIo,
      { value?: EsExecutionIo['value']; size?: number }
    >({
      refresh,
      operations: targets.flatMap(({ document, index }) => [
        {
          update: {
            _index: index,
            _id: document.id,
            retry_on_conflict: 3,
          },
        },
        // Assignment replaces `value`. A partial `doc` update would merge it and
        // leave removed fields, such as a HITL token hash, in the stored payload.
        {
          script: {
            source: 'ctx._source.value = params.value; ctx._source.size = params.size;',
            params: { value: document.value, size: document.size },
          },
        },
      ]),
    });

    targets.forEach(({ position, document }, index) => {
      items[position] = toBulkItemResponse(document.id, response.items[index]);
    });
    return items;
  }

  /** mget the two newest IO backing indexes, then search the data stream for the rest. */
  private async readRecentBackingIndexes(
    ids: string[],
    sourceIncludes?: string[]
  ): Promise<Map<string, IoHit>> {
    const recentIndexes = [...this.deps.metadataManager.getMeta().backingIndexes]
      .slice(-2)
      .reverse();
    const byId = new Map<string, IoHit>();
    if (recentIndexes.length === 0) {
      return byId;
    }

    const lookups = ids.flatMap((id) => recentIndexes.map((index) => ({ id, index })));
    const sourceFilter = sourceFilterFor(sourceIncludes);
    const response = await this.deps.esClient.mget<EsExecutionIo>({
      docs: lookups.map(({ id, index }) => ({
        _index: index,
        _id: id,
        ...(sourceFilter ? { _source: sourceFilter } : {}),
      })),
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
      ...(sourceFilter ? { _source: sourceFilter } : {}),
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
  private async readPlainIndexes(
    ioIds: string[],
    sourceIncludes?: string[]
  ): Promise<Map<string, IoHit>> {
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
        sourceIncludes: sourceIncludesFor(index, types, sourceIncludes),
      }))
    );

    let response: estypes.MgetResponse<LegacyExecutionIoSource>;
    try {
      response = await this.deps.esClient.mget<LegacyExecutionIoSource>({
        docs: lookups.map(({ executionId, index, sourceIncludes: legacyIncludes }) => ({
          _index: index,
          _id: executionId,
          _source: { includes: legacyIncludes },
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
function sourceFilterFor(sourceIncludes?: string[]): { includes: string[] } | undefined {
  if (!sourceIncludes?.length) {
    return undefined;
  }
  return { includes: sourceIncludes };
}

/**
 * `value.*` on the data stream is `input` / `output` on a legacy step doc and
 * `context.inputs` / `context.output` on a legacy workflow doc.
 */
function sourceIncludesFor(
  index: string,
  types: Set<ExecutionIoType>,
  sourceIncludes?: string[]
): string[] {
  const workflow = isWorkflowIndex(index);
  const valueFields = (sourceIncludes ?? [])
    .filter((field) => field.startsWith('value.'))
    .map((field) => field.slice('value.'.length))
    .filter((field) => field.length > 0);
  const includes: string[] = [];
  if (types.has('input')) {
    const base = workflow ? 'context.inputs' : 'input';
    includes.push(
      ...(valueFields.length > 0 ? valueFields.map((field) => `${base}.${field}`) : [base])
    );
  }
  if (types.has('output')) {
    const base = workflow ? 'context.output' : 'output';
    includes.push(
      ...(valueFields.length > 0 ? valueFields.map((field) => `${base}.${field}`) : [base])
    );
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
