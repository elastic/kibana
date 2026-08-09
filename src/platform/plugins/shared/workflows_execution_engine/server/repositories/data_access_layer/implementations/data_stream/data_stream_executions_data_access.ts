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

import { getExecutionsByIds } from '../../lib/get_executions_by_ids';
import type { SharedBulkItem } from '../../lib/shared_bulk';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkItem,
  BulkRequestOptions,
  BulkResponse,
  DataClient,
  DocumentVersionFields,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
} from '../../types';
import { retryTransientEsErrors } from '../../../../lib/retry_transient_es_errors';

const notImplemented = (method: string): never => {
  throw new Error(`DataStreamExecutionsDataAccess.${method} is not implemented`);
};

export interface DataStreamExecutionsDataAccessDeps<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  versionsCollector?: Map<string, Required<DocumentVersionFields>>;
  additionalIndexesToQuery?: string[];
  dateField: keyof TExecution;
  logger: Logger;
}
  
export class DataStreamExecutionsDataAccess<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  private additionalIndexesToQuery: string[];
  private versionsCollector: Map<string, Required<DocumentVersionFields>> | undefined;

  constructor(private readonly deps: DataStreamExecutionsDataAccessDeps<TExecution>) {
    this.additionalIndexesToQuery = deps.additionalIndexesToQuery ?? [];
    this.versionsCollector = deps.versionsCollector;
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
        this.versionsCollector?.set(hit._id, {
          index: hit._index,
          seqNo: hit._seq_no,
          primaryTerm: hit._primary_term,
        });
      }
    });
    return searchResponse;
  }

  public async count(request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return await retryTransientEsErrors(
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
    const resolved = ids.map((id) => {
      if (typeof id === 'string') {
        const version = this.versionsCollector?.get(id);

        if (version) {
          return { id, index: version.index };
        }

        return id;
      }

      return { id: id.id, index: id.index };
    });
    const getByIdsResponse = await this.getByIdsInternal(resolved, options);
    getByIdsResponse.items.forEach((item) => {
      if (item.seqNo === undefined || item.primaryTerm === undefined) {
        return;
      }

      this.versionsCollector?.set(item.document.id, {
        index: item.index,
        seqNo: item.seqNo,
        primaryTerm: item.primaryTerm,
      });
    });
    return getByIdsResponse;
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    // Datastream requires a timestamp field to be present in the document, so we need to assign it before sending the bulk request.
    // We take it from the document's dateField, which is specified in the deps. If the dateField is not present, we don't assign a timestamp.
    // startedAt for StepExeucutions and createdAt for WorkflowExecutions are the dateFields that are used to assign the timestamp.
    const itemsWithTimestamp = await this.assignTimestampToItems(request.items);
    const itemsWithVersion = await this.resolveBulkItemVersions(itemsWithTimestamp);

    const bulkResponse = await sharedBulk(
      this.deps.esClient,
      {
        ...request,
        items: itemsWithVersion,
      },
      this.deps.logger
    );

    bulkResponse.items.forEach((item) => {
      if (item.error || item.seqNo === undefined || item.primaryTerm === undefined) {
        return;
      }

      this.versionsCollector?.set(item.id, {
        index: item.index,
        seqNo: item.seqNo,
        primaryTerm: item.primaryTerm,
      });
    });
    return bulkResponse;
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
          ...(timestampValue ? { ['@timestamp']: timestampValue } : {}),
        },
      };
    });
  }

  private async resolveBulkItemVersions(
    items: BulkItem<TExecution>[]
  ): Promise<SharedBulkItem<TExecution>[]> {
    const resolved = new Array<SharedBulkItem<TExecution>>(items.length);
    const pendingIds = new Map<string, number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cached = this.versionsCollector?.get(item.document.id);

      if (item.operation === 'create') {
        resolved[i] = { ...item, index: this.deps.dataStreamName };
      } else if (item.index && item.seqNo !== undefined && item.primaryTerm !== undefined) {
        resolved[i] = { ...item, index: item.index };
      } else if (cached) {
        resolved[i] = { ...item, ...cached };
      } else {
        pendingIds.set(item.document.id, i);
      }
    }

    if (pendingIds.size > 0) {
      const writeIndex = await this.resolveWriteIndex();
      const getByIdsResponse = await this.getByIdsInternal(
        Array.from(pendingIds.keys()),
        {
          sourceIncludes: [],
        },
        writeIndex
      );
      getByIdsResponse.items.forEach((item) => {
        const i = pendingIds.get(item.document.id);

        if (i !== undefined) {
          resolved[i] = {
            ...items[i],
            index: item.index,
            seqNo: item.seqNo,
            primaryTerm: item.primaryTerm,
          };
        }
      });

      getByIdsResponse.missing.forEach((id) => {
        const idx = pendingIds.get(id);

        if (idx === undefined) {
          return;
        }

        if (items[idx]?.operation === 'upsert') {
          resolved[idx] = {
            ...items[idx],
            operation: 'create',
            index: this.deps.dataStreamName,
          };
        } else if (items[idx]?.operation === 'update') {
          resolved[idx] = {
            ...items[idx],
            index: writeIndex,
          };
        }
      });
    }

    return resolved;
  }

  private async resolveWriteIndex(): Promise<string> {
    const { data_streams: dataStreams } = await retryTransientEsErrors(
      () =>
        this.deps.esClient.indices.getDataStream({
          name: this.deps.dataStreamName,
        }),
      { logger: this.deps.logger }
    );

    const writeIndex = dataStreams[0]?.indices.at(-1)?.index_name;
    if (!writeIndex) {
      throw new Error(`No write backing index found for data stream ${this.deps.dataStreamName}`);
    }
    return writeIndex;
  }

  private async getByIdsInternal(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>,
    writeIndex?: string
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }
    const idsWithResolvedIndexes: { id: string; index: string }[] = [];

    const map: Map<string, GetExecutionByIdsItem<TExecution> | undefined> = ids.reduce(
      (acc, id) => {
        acc.set(typeof id === 'string' ? id : id.id, undefined);
        return acc;
      },
      new Map()
    );

    let resolvedWriteIndex = writeIndex;

    for (let i = 0; i < ids.length; i++) {
      const item = ids[i];

      if (typeof item === 'string') {
        if (!resolvedWriteIndex) {
          resolvedWriteIndex = await this.resolveWriteIndex();
        }
        idsWithResolvedIndexes.push({ id: item, index: resolvedWriteIndex });
      } else if (item.id && item.index) {
        idsWithResolvedIndexes.push({ id: item.id, index: item.index });
      }
    }

    const getByIdsResponse = await getExecutionsByIds({
      esClient: this.deps.esClient,
      ids: idsWithResolvedIndexes,
      defaultIndex: this.deps.dataStreamName,
      options,
      logger: this.deps.logger,
    });

    getByIdsResponse.items.forEach((item) => {
      map.set(item.document.id, item);
    });

    if (getByIdsResponse.missing.length) {
      const searchResponse = await this.search({
        size: getByIdsResponse.missing.length,
        query: {
          ids: {
            values: getByIdsResponse.missing,
          },
        },
        _source_includes: options?.sourceIncludes,
        _source_excludes: options?.sourceExcludes,
      });

      searchResponse.hits.hits
        .filter((hit) => hit?._source)
        .forEach((hit) => {
          if (hit._id && hit?._source) {
            map.set(hit._id, {
              document: hit._source as TExecution,
              index: hit._index,
              seqNo: hit._seq_no,
              primaryTerm: hit._primary_term,
            });
          }
        });
    }

    return ids.reduce(
      (acc, current) => {
        const id = typeof current === 'string' ? current : current.id;
        const item = map.get(id);
        if (item) {
          acc.items.push(item);
        } else {
          acc.missing.push(id);
        }
        return acc;
      },
      {
        items: [],
        missing: [],
      } as GetExecutionsByIdsResponse<TExecution>
    );
  }
}
