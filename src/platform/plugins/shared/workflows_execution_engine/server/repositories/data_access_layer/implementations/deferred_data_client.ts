/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  AggregationsAggregate,
  CountResponse,
  DeleteByQueryResponse,
  SearchResponse,
} from '@elastic/elasticsearch/lib/api/types';
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
} from '../types';

export class DeferredDataClient<TExecution extends { id: string }>
  implements DataClient<TExecution>
{
  private dataClientPromise: Promise<DataClient<TExecution>>;

  constructor(dataClientFactory: () => Promise<DataClient<TExecution>>) {
    this.dataClientPromise = dataClientFactory();
  }

  search(
    request: ExecutionsSearchRequest
  ): Promise<SearchResponse<TExecution, Record<string, AggregationsAggregate>>> {
    return this.dataClientPromise.then((dataClient) => dataClient.search(request));
  }

  count(request: ExecutionsCountRequest): Promise<CountResponse> {
    return this.dataClientPromise.then((dataClient) => dataClient.count(request));
  }

  getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution> | undefined
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    return this.dataClientPromise.then((dataClient) => dataClient.getByIds(ids, options));
  }

  bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    return this.dataClientPromise.then((dataClient) => dataClient.bulk(request));
  }

  scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse> {
    return this.dataClientPromise.then((dataClient) => dataClient.scriptUpdate(request));
  }

  deleteByQuery(request: ExecutionsDeleteByQueryRequest): Promise<DeleteByQueryResponse> {
    return this.dataClientPromise.then((dataClient) => dataClient.deleteByQuery(request));
  }
}
