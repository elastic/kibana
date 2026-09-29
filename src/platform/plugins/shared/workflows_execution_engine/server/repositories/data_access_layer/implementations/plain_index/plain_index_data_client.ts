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

import { sharedBulk } from '../../lib/bulk/shared_bulk';
import { getExecutionsByIds } from '../../lib/get_executions_by_ids';
import type {
  BulkRequestOptions,
  BulkResponse,
  DataClient,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
} from '../../types';
import { isBulkUpdaterItem } from '../../types';

export interface PlainIndexDataClientDeps {
  esClient: ElasticsearchClient;
  indexName: string;
  logger: Logger;
}

export class PlainIndexDataClient<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  constructor(private readonly deps: PlainIndexDataClientDeps) {}

  public async search(
    request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    return this.deps.esClient.search<TExecution>({
      ...request,
      index: this.deps.indexName,
    });
  }

  public async count(request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return this.deps.esClient.count({
      ...request,
      index: this.deps.indexName,
    });
  }

  public async getByIds(
    ids: string[],
    options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    return getExecutionsByIds({
      esClient: this.deps.esClient,
      ids,
      defaultIndex: this.deps.indexName,
      options,
      logger: this.deps.logger,
    });
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    return sharedBulk({
      esClient: this.deps.esClient,
      request: {
        ...request,
        items: request.items.map((item) =>
          isBulkUpdaterItem(item) ? item : { ...item, index: this.deps.indexName }
        ),
      },
      logger: this.deps.logger,
      fallbackIndexes: [this.deps.indexName],
    });
  }

  public async deleteByQuery(
    request: ExecutionsDeleteByQueryRequest
  ): Promise<estypes.DeleteByQueryResponse> {
    return this.deps.esClient.deleteByQuery({
      ...request,
      index: this.deps.indexName,
    });
  }
}
