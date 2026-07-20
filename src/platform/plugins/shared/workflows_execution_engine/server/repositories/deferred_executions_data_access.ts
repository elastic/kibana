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
  ExecutionsCountRequest,
  ExecutionsDataAccess,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
} from '@kbn/workflows/server/data_access_layer';

export class DeferredExecutionsDataAccess<TExecution extends { id: string }>
  implements ExecutionsDataAccess<TExecution>
{
  private executionsDataAccessPromise: Promise<ExecutionsDataAccess<TExecution>>;

  constructor(executionsDataAccessFactory: () => Promise<ExecutionsDataAccess<TExecution>>) {
    this.executionsDataAccessPromise = executionsDataAccessFactory();
  }

  search(
    request: ExecutionsSearchRequest
  ): Promise<SearchResponse<TExecution, Record<string, AggregationsAggregate>>> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.search(request)
    );
  }

  count(request: ExecutionsCountRequest): Promise<CountResponse> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.count(request)
    );
  }

  getByIds(
    ids: (string | { id: string; index: string })[],
    options?: GetExecutionsByIdsOptions<TExecution> | undefined
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.getByIds(ids, options)
    );
  }

  bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.bulk(request)
    );
  }

  scriptUpdate(request: ScriptUpdateRequest): Promise<ScriptUpdateResponse> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.scriptUpdate(request)
    );
  }

  deleteByQuery(request: ExecutionsDeleteByQueryRequest): Promise<DeleteByQueryResponse> {
    return this.executionsDataAccessPromise.then((executionsDataAccess) =>
      executionsDataAccess.deleteByQuery(request)
    );
  }
}
