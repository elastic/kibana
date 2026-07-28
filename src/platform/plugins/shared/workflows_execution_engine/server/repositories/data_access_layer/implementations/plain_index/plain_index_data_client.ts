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
import { getExecutionsByIds } from '../../lib/get_executions_by_ids';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkRequestOptions,
  BulkResponse,
  DataClient,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
} from '../../types';
import { retryTransientEsErrors } from '../../../../lib/retry_transient_es_errors';

export interface PlainIndexDataClientDeps {
  esClient: ElasticsearchClient;
  indexName: string;
  mappings: MappingTypeMapping;
  logger: Logger;
}

export class PlainIndexDataClient<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  constructor(private readonly deps: PlainIndexDataClientDeps) {}

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    return retryTransientEsErrors(() => this.deps.esClient.search<TExecution>({
      index: this.deps.indexName,
      ...request,
    }), { logger: this.deps.logger });
  }

  public async count(request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return retryTransientEsErrors(
      () =>
        this.deps.esClient.count({
          index: this.deps.indexName,
          ...request,
        }),
      { logger: this.deps.logger }
    );
  }

  public async getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    return getExecutionsByIds({
      esClient: this.deps.esClient,
      ids: ids.map((id) =>
        typeof id === 'string' ? { id, index: [this.deps.indexName] } : id
      ) as (string | { id: string; index: string[] })[],
      defaultIndex: this.deps.indexName,
      options,
      logger: this.deps.logger,
    });
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    const itemsWithIndex = request.items.map((item) => ({
      ...item,
      index: this.deps.indexName,
    }));
    const response = await sharedBulk(this.deps.esClient, {
      ...request,
      items: itemsWithIndex,
    }, this.deps.logger);
    if (response.errors) {
      const errorCount = response.items.filter((item) => item.error).length;
      this.deps.logger.debug(
        `Bulk operation on ${this.deps.indexName} completed with ${errorCount} error(s)`
      );
    }
    return response;
  }

  public async scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse> {
    return executeScriptUpdate({
      esClient: this.deps.esClient,
      indexName: this.deps.indexName,
      request,
      logger: this.deps.logger,
    });
  }

  public async deleteByQuery(
    request: ExecutionsDeleteByQueryRequest
  ): Promise<estypes.DeleteByQueryResponse> {
    return retryTransientEsErrors(
      () =>
        this.deps.esClient.deleteByQuery({
          index: this.deps.indexName,
          ...request,
        }),
      { logger: this.deps.logger }
    );
  }
}
