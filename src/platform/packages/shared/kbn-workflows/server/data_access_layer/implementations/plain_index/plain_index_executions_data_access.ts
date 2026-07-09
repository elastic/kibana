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

import { executeIndexBulkUpsert } from './execute_index_bulk_upsert';
import { createOrUpdateIndex } from '../../init/create_or_update_index';
import type {
  BulkUpsertRequest,
  BulkUpsertResponse,
  ExecutionsCountRequest,
  ExecutionsDataAccess,
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

export class PlainIndexExecutionsDataAccess<
  TExecution extends Record<string, unknown> & { id: string }
> implements ExecutionsDataAccess<TExecution>
{
  constructor(private readonly deps: PlainIndexExecutionsDataAccessDeps<TExecution>) {}

  public async init(): Promise<void> {
    await createOrUpdateIndex({
      esClient: this.deps.esClient,
      indexName: this.deps.indexName,
      mappings: this.deps.mappings,
      logger: this.deps.logger,
    });
  }

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

  public async bulkUpsert(request: BulkUpsertRequest<TExecution>): Promise<BulkUpsertResponse> {
    return executeIndexBulkUpsert({
      esClient: this.deps.esClient,
      indexName: this.deps.indexName,
      request,
    });
  }
}
