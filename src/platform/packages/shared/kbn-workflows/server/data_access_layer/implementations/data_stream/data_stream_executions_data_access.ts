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
  DocumentVersionFields,
  ExecutionsCountRequest,
  ExecutionsDataAccess,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionByIdsItem,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
} from '../../types';

const notImplemented = (method: string): never => {
  throw new Error(`DataStreamExecutionsDataAccess.${method} is not implemented`);
};

export interface DataStreamExecutionsDataAccessDeps<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  logger?: Logger;
  normalizeExecutionOnGet?: (
    execution: TExecution,
    options?: GetExecutionsByIdsOptions<TExecution>
  ) => TExecution;
}

export class DataStreamExecutionsDataAccess<TExecution extends { id: string }>
  implements ExecutionsDataAccess<TExecution>
{
  private versions = new Map<string, Required<DocumentVersionFields>>();

  constructor(private readonly deps: DataStreamExecutionsDataAccessDeps<TExecution>) {}

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    const searchResponse: estypes.SearchResponse<TExecution> = await this.deps.esClient.search({
      index: this.deps.dataStreamName,
      ...request,
    });

    searchResponse.hits.hits.forEach((hit) => {
      if (hit._id && hit?._source && hit._seq_no !== undefined && hit._primary_term !== undefined) {
        this.versions.set(hit._id, {
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
      index: this.deps.dataStreamName,
      ...request,
    });
  }

  public async getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    const resolved = ids.map((id) => {
      if (typeof id === 'string') {
        const version = this.versions.get(id);

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

      this.versions.set(item.document.id, {
        index: item.index,
        seqNo: item.seqNo,
        primaryTerm: item.primaryTerm,
      });
    });
    return getByIdsResponse;
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    const items = await this.resolveBulkItemVersions(request.items);

    const bulkResponse = await sharedBulk(this.deps.esClient, {
      ...request,
      items,
    });

    bulkResponse.items.forEach((item) => {
      if (item.error || item.seqNo === undefined || item.primaryTerm === undefined) {
        return;
      }

      this.versions.set(item.id, {
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

  private async resolveBulkItemVersions(
    items: BulkItem<TExecution>[]
  ): Promise<SharedBulkItem<TExecution>[]> {
    const resolved = new Array<SharedBulkItem<TExecution>>(items.length);
    const pendingIds = new Map<string, number>();

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const cached = this.versions.get(item.document.id);

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
          // The update is not found, so we assign write index to the update
          // so it will fail on the update operation
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
    const { data_streams: dataStreams } = await this.deps.esClient.indices.getDataStream({
      name: this.deps.dataStreamName,
    });

    const writeIndex = dataStreams[0]?.indices.at(-1)?.index_name;
    if (!writeIndex) {
      throw new Error(`No write backing index found for data stream ${this.deps.dataStreamName}`);
    }
    return writeIndex;
  }

  public async getByIdsInternal(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>,
    writeIndex?: string
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    if (ids.length === 0) {
      return { items: [], missing: [] };
    }
    const idsWithResolvedIndexes: { id: string; index: string }[] = [];

    // Create a map of the ids to undefined so we can track which ids are missing after the search
    const map: Map<string, GetExecutionByIdsItem<TExecution> | undefined> = ids.reduce(
      (acc, id) => {
        acc.set(typeof id === 'string' ? id : id.id, undefined);
        return acc;
      },
      new Map()
    );

    let resolvedWriteIndex = writeIndex;

    // Resolve the write index for the ids that don't have an index
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

    // Get the executions by ids first
    const getByIdsResponse = await getExecutionsByIds({
      esClient: this.deps.esClient,
      ids: idsWithResolvedIndexes,
      defaultIndex: this.deps.dataStreamName,
      options,
    });

    // Add the found executions to the map
    getByIdsResponse.items.forEach((item) => {
      map.set(item.document.id, item);
    });

    // If there are any missing ids, search for them
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

      // Add the found executions to the map
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

    // Return the executions by ids response in the provided ids order
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
