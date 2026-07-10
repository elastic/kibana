/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticsearchClient, Logger } from '@kbn/core/server';

import type {
  BulkItem,
  BulkItemResponse,
  BulkRequestOptions,
  BulkResponse,
  ExecutionsCountRequest,
  ExecutionsDataAccess,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
} from '../../types';

export interface PlainIndexExecutionsDataAccessDeps<TExecution extends { id: string }> {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  logger?: Logger;
  normalizeExecutionOnGet?: (
    execution: TExecution,
    options?: GetExecutionsByIdsOptions<TExecution>
  ) => TExecution;
}

export class PlainIndexExecutionsDataAccess<TExecution extends { id: string }>
  implements ExecutionsDataAccess<TExecution>
{
  constructor(private readonly deps: PlainIndexExecutionsDataAccessDeps<TExecution>) {}

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    return this.deps.esClient.search<TExecution>({
      index: this.deps.indexName,
      ...request,
    });
  }

  public async count(request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return this.deps.esClient.count({
      index: this.deps.indexName,
      ...request,
    });
  }

  public async getByIds(
    ids: string[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<TExecution[]> {
    if (ids.length === 0) {
      return [];
    }

    const { sourceIncludes, sourceExcludes } = options ?? {};
    const response = await this.deps.esClient.mget<TExecution>({
      index: this.deps.indexName,
      ids,
      ...(sourceIncludes?.length ? { _source_includes: sourceIncludes } : {}),
      ...(sourceExcludes?.length ? { _source_excludes: sourceExcludes } : {}),
    });

    const executionDocs: TExecution[] = [];
    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const source = doc._source as TExecution;
        executionDocs.push(
          this.deps.normalizeExecutionOnGet
            ? this.deps.normalizeExecutionOnGet(source, options)
            : source
        );
      }
    }

    return executionDocs;
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    if (request.items.length === 0) {
      return {
        items: [],
        errors: false,
      };
    }

    type BulkOperation = NonNullable<
      estypes.BulkRequest<TExecution, Partial<TExecution> & { id: string }>['operations']
    >[number];

    const operations: BulkOperation[] = request.items.flatMap((item): BulkOperation[] => {
      const actionMeta = {
        _id: item.document.id,
        ...(item.seqNo !== undefined ? { if_seq_no: item.seqNo } : {}),
        ...(item.primaryTerm !== undefined ? { if_primary_term: item.primaryTerm } : {}),
      };

      switch (item.operation) {
        case 'create':
          return [{ create: actionMeta }, item.document as BulkOperation];

        case 'update':
          return [
            {
              update: {
                ...actionMeta,
                ...(item.retryOnConflict !== undefined
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
                ...(item.retryOnConflict !== undefined
                  ? { retry_on_conflict: item.retryOnConflict }
                  : {}),
              },
            },
            { doc: item.document, doc_as_upsert: true },
          ];

        default:
          throw new Error(`Invalid operation: ${(item as BulkItem<TExecution>).operation}`);
      }
    });

    const response = await this.deps.esClient.bulk<
      TExecution,
      Partial<TExecution> & { id: string }
    >({
      index: this.deps.indexName,
      refresh: request.refresh,
      operations,
    });

    const items: BulkItemResponse[] = [];

    response.items.forEach((item) => {
      const result = item.create ?? item.update;
      if (!result?._id) {
        return;
      }

      items.push({
        id: result?._id,
        error: result?.error,
        _seq_no: result?._seq_no,
        _primary_term: result?._primary_term,
      });
    });

    return {
      items,
      errors: response.errors,
    };
  }

  public async deleteByQuery(
    request: ExecutionsDeleteByQueryRequest
  ): Promise<estypes.DeleteByQueryResponse> {
    return this.deps.esClient.deleteByQuery({
      index: this.deps.indexName,
      ...request,
    });
  }
}
