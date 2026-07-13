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

import { executeScriptUpdate } from '../../lib/execute_script_update';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkRequestOptions,
  BulkResponse,
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
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    if (ids.length === 0) {
      return {
        items: [],
        missing: [],
      };
    }

    const { sourceIncludes, sourceExcludes } = options ?? {};

    const sourceFilter =
      sourceIncludes?.length || sourceExcludes?.length
        ? {
            _source: {
              ...(sourceIncludes?.length ? { includes: sourceIncludes } : {}),
              ...(sourceExcludes?.length ? { excludes: sourceExcludes } : {}),
            },
          }
        : {};

    const docs = ids.map((item) =>
      typeof item === 'string'
        ? { _index: this.deps.indexName, _id: item, ...sourceFilter }
        : { _index: item.index, _id: item.id, ...sourceFilter }
    );
    const response = await this.deps.esClient.mget<TExecution>({ docs });

    const executionDocs: GetExecutionByIdsItem<TExecution>[] = [];

    for (const doc of response.docs) {
      if ('found' in doc && doc.found && doc._source) {
        const source = doc._source as TExecution;
        executionDocs.push({
          document: this.deps.normalizeExecutionOnGet
            ? this.deps.normalizeExecutionOnGet(source, options)
            : source,
          index: doc._index,
          seqNo: doc._seq_no,
          primaryTerm: doc._primary_term,
        });
      }
    }

    return {
      items: executionDocs,
      missing: response.docs.filter((doc) => !('found' in doc && doc.found)).map((doc) => doc._id),
    };
  }

  public bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    const itemsWithIndex = request.items.map((item) => ({
      ...item,
      index: item.index ?? this.deps.indexName,
    }));
    return sharedBulk(this.deps.esClient, {
      ...request,
      items: itemsWithIndex,
    });
  }

  public async scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse> {
    return executeScriptUpdate({
      esClient: this.deps.esClient,
      indexName: this.deps.indexName,
      request,
    });
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
