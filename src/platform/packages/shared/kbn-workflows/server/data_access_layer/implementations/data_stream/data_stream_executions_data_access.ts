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

import type { SharedBulkItem } from '../../lib/shared_bulk';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkRequestOptions,
  BulkResponse,
  DocumentVersionFields,
  ExecutionDataStreamClient,
  ExecutionsCountRequest,
  ExecutionsDataAccess,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
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
  dataStreamClient: ExecutionDataStreamClient;
  logger?: Logger;
  normalizeExecutionOnGet?: (
    execution: TExecution,
    options?: GetExecutionsByIdsOptions<TExecution>
  ) => TExecution;
}

export class DataStreamExecutionsDataAccess<TExecution extends { id: string }>
  implements ExecutionsDataAccess<TExecution>
{
  private versions = new Map<string, DocumentVersionFields>();

  constructor(private readonly deps: DataStreamExecutionsDataAccessDeps<TExecution>) {}

  public async search(
    _request: ExecutionsSearchRequest
  ): Promise<estypes.SearchResponse<TExecution>> {
    return notImplemented('search');
  }

  public async count(_request: ExecutionsCountRequest): Promise<estypes.CountResponse> {
    return notImplemented('count');
  }

  public async getByIds(
    _ids: (string | { id: string; index: string })[],
    _options?: GetExecutionsByIdsOptions<TExecution>
  ): Promise<GetExecutionsByIdsResponse<TExecution>> {
    return notImplemented('getByIds');
  }

  public async bulk(request: BulkRequestOptions<TExecution>): Promise<BulkResponse> {
    const itemsWithIndex: SharedBulkItem<TExecution>[] = [];
    const indexesWithoutVersions = new Map<string, number>();

    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];

      if (item.operation !== 'create') {
        const version = this.versions.get(item.document.id);

        if (version) {
          itemsWithIndex.push({
            ...item,
            index: version.index,
            seqNo: version.seqNo,
            primaryTerm: version.primaryTerm,
          });
        } else {
          indexesWithoutVersions.set(item.document.id, i);
        }
      }

      itemsWithIndex.push({
        ...item,
        index: this.deps.dataStreamName,
      });
    }

    const getByIdsResponse = await this.getByIds(
      Array.from(indexesWithoutVersions.values()).map((_, i) => itemsWithIndex[i].document.id)
    );
    for (const item of getByIdsResponse.items) {
      const index = indexesWithoutVersions.get(item.document.id);

      if (index) {
        itemsWithIndex[index] = {
          ...itemsWithIndex[index],
          index: item.index,
          seqNo: item.seqNo,
          primaryTerm: item.primaryTerm,
        };
      }
    }

    const bulkResponse = await sharedBulk(this.deps.esClient, {
      ...request,
      items: itemsWithIndex,
    });
    bulkResponse.items.forEach((item) =>
      this.versions.set(item.id, {
        index: item.index,
        seqNo: item.seqNo,
        primaryTerm: item.primaryTerm,
      })
    );
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
}
