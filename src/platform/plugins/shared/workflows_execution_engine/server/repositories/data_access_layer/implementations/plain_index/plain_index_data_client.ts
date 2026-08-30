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

import { executeScriptUpdate } from '../../lib/execute_script_update';
import { getExecutionsByIds } from '../../lib/get_executions_by_ids';
import { sharedBulk } from '../../lib/shared_bulk';
import type {
  BulkItemResponse,
  BulkItemResult,
  BulkPlainItem,
  BulkRequestOptions,
  BulkResponse,
  BulkUpdaterItem,
  DataClient,
  ExecutionsCountRequest,
  ExecutionsDeleteByQueryRequest,
  ExecutionsSearchRequest,
  GetExecutionsByIdsOptions,
  GetExecutionsByIdsResponse,
  ScriptUpdateRequest,
  ScriptUpdateResponse,
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
    if (request.items.length === 0) {
      return { items: [], errors: false };
    }

    const result = new Array<BulkItemResponse>(request.items.length);
    let hasErrors = false;

    // Split up front — updater items need a read-modify-write cycle via getByIds.
    interface UpdaterQueueItem {
      item: BulkUpdaterItem<TExecution>;
      originalIndex: number;
      remainingRetries: number;
    }
    const updaterQueue: UpdaterQueueItem[] = [];
    const plainItemsWithIndex: Array<{ item: BulkPlainItem<TExecution>; originalIndex: number }> =
      [];

    for (let i = 0; i < request.items.length; i++) {
      const item = request.items[i];
      if (isBulkUpdaterItem(item)) {
        updaterQueue.push({ item, originalIndex: i, remainingRetries: item.retryOnConflict ?? 0 });
      } else {
        plainItemsWithIndex.push({ item: item as BulkPlainItem<TExecution>, originalIndex: i });
      }
    }

    // --- Updater items: read-modify-write with conflict retry ---
    if (updaterQueue.length > 0) {
      const pending = [...updaterQueue];

      while (pending.length > 0) {
        const batch = pending.splice(0);
        const ids = batch.map((qi) => qi.item.documentId);

        const allSourceFields = [
          ...new Set(batch.flatMap((qi) => [...qi.item.sourceFields])),
        ] as Array<Extract<keyof TExecution, string>>;

        const { items: found } = await this.getByIds(ids, {
          sourceIncludes: allSourceFields.length > 0 ? allSourceFields : undefined,
        });
        const foundById = new Map(found.map((f) => [f.document.id, f]));

        interface ToWrite {
          qi: UpdaterQueueItem;
          plainItem: BulkPlainItem<TExecution>;
        }
        const toWrite: ToWrite[] = [];

        for (const qi of batch) {
          const fetched = foundById.get(qi.item.documentId);

          if (!fetched || fetched.seqNo === undefined || fetched.primaryTerm === undefined) {
            result[qi.originalIndex] = {
              id: qi.item.documentId,
              index: '',
              error: {
                type: 'document_missing_exception',
                reason: `[_doc][${qi.item.documentId}]: document missing`,
              },
            };
            hasErrors = true;
          } else {
            const patch = qi.item.updater(
              fetched.document as Pick<TExecution, keyof TExecution & string>
            );

            if (patch === 'noop') {
              result[qi.originalIndex] = {
                id: qi.item.documentId,
                index: fetched.index,
                seqNo: fetched.seqNo,
                primaryTerm: fetched.primaryTerm,
                result: 'noop' as BulkItemResult,
              };
            } else {
              toWrite.push({
                qi,
                plainItem: {
                  operation: 'update',
                  document: { ...(patch as Partial<TExecution>), id: qi.item.documentId },
                  index: fetched.index,
                  seqNo: fetched.seqNo,
                  primaryTerm: fetched.primaryTerm,
                },
              });
            }
          }
        }

        if (toWrite.length > 0) {
          const esResponse = await sharedBulk(
            this.deps.esClient,
            { refresh: request.refresh, items: toWrite.map(({ plainItem }) => plainItem) },
            this.deps.logger
          );

          esResponse.items.forEach((responseItem, idx) => {
            const { qi } = toWrite[idx];
            const isConflict = responseItem.error?.type === 'version_conflict_engine_exception';

            if (isConflict && qi.remainingRetries > 0) {
              pending.push({ ...qi, remainingRetries: qi.remainingRetries - 1 });
            } else {
              result[qi.originalIndex] = responseItem;
              hasErrors = hasErrors || !!responseItem.error;
            }
          });
        }
      }
    }

    // --- Plain items: sharedBulk (retryOnConflicts handles retry internally) ---
    if (plainItemsWithIndex.length > 0) {
      const plainResponse = await sharedBulk(
        this.deps.esClient,
        {
          ...request,
          items: plainItemsWithIndex.map(({ item }) => ({
            ...item,
            index: this.deps.indexName,
          })),
        },
        this.deps.logger
      );

      plainItemsWithIndex.forEach(({ originalIndex }, idx) => {
        result[originalIndex] = plainResponse.items[idx];
        hasErrors = hasErrors || !!plainResponse.items[idx].error;
      });
    }

    return { items: result, errors: hasErrors };
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
    return this.deps.esClient.deleteByQuery({
      ...request,
      index: this.deps.indexName,
    });
  }
}
