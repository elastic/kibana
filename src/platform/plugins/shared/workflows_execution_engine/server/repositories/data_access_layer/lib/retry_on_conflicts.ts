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
import type {
  BulkItem,
  BulkItemResponse,
  BulkPlainItem,
  BulkRequestOptions,
  BulkResponse,
  BulkUpdaterItem,
} from '../types';
import { isBulkUpdaterItem } from '../types';

export async function retryOnConflicts<TExecution extends { id: string }>(
  esClient: ElasticsearchClient,
  logger: Logger,
  indexes: string[],
  options: BulkRequestOptions<TExecution>,
  action: (request: BulkRequestOptions<TExecution>) => Promise<BulkResponse>
): Promise<BulkResponse<TExecution>> {
  let queuedItems: Array<{ item: BulkItem<TExecution>; originalIndex: number }> = options.items.map(
    (item, index) => ({ item, originalIndex: index })
  );
  let attempt = 0;
  const result = new Array<BulkItemResponse>(options.items.length);
  let mgetDocs: estypes.MgetOperation[] | undefined;
  const withUpdaters = queuedItems.reduce((acc, { item, originalIndex }) => {
    if (isBulkUpdaterItem(item)) {
      acc.set(originalIndex, { item, originalIndex });
    }
    return acc;
  }, new Map<number, { item: BulkUpdaterItem<TExecution>; originalIndex: number }>());

  while (queuedItems?.length > 0) {
    const withConflicts = new Map<number, { item: BulkItemResponse; originalIndex: number }>();

    mgetDocs = mgetDocs
      ? mgetDocs
      : withUpdaters
          .values()
          .map(({ item }) => ({
            _id: item.documentId,
            _index: indexes[0],
            source: item.sourceFields ? [...item.sourceFields] : false,
          }))
          .toArray();

    const mgetResponse = mgetDocs?.length
      ? await esClient.mget({
          docs: mgetDocs,
        })
      : undefined;

    if (mgetResponse) {
      const map = new Map<
        string,
        { id: string; source: TExecution; seq_no: number; primary_term: number; index: string }
      >();
      mgetResponse.docs.forEach((doc) => {
        if (
          'found' in doc &&
          doc.found &&
          doc._id &&
          doc._seq_no !== undefined &&
          doc._primary_term !== undefined &&
          doc._index
        ) {
          map.set(doc._id, {
            id: doc._id,
            source: doc._source as TExecution,
            seq_no: doc._seq_no,
            primary_term: doc._primary_term,
            index: doc._index,
          } as { id: string; source: TExecution; seq_no: number; primary_term: number; index: string });
        }
      });
      withUpdaters.forEach(({ item, originalIndex }) => {
        const requestItem = queuedItems[originalIndex];
        const fromMap = map.get(item.documentId);

        if (!requestItem || !fromMap) {
          return;
        }
        const update = item.updater(fromMap?.source ?? ({} as TExecution));
        if (update === 'noop') {
          result[originalIndex] = {
            id: item.documentId,
            index: fromMap?.index ?? indexes[0],
            seqNo: fromMap?.seq_no,
            primaryTerm: fromMap?.primary_term,
            result: 'noop',
          };
          return;
        }

        const plainIndexUpdate: BulkPlainItem<TExecution> = {
          operation: item.operation,
          document: {
            id: item.documentId,
            ...update,
          },
          retryOnConflict: item.retryOnConflict,
          seqNo: fromMap?.seq_no,
          primaryTerm: fromMap?.primary_term,
        };
        queuedItems[originalIndex] = {
          item: plainIndexUpdate,
          originalIndex,
        };
      });
    }

    const response = await action({ ...options, items: queuedItems.map((q) => q.item) });

    response.items.forEach((item, index) => {
      const originalIndex = queuedItems[index].originalIndex;
      const retryOnConflict = queuedItems[originalIndex]?.item?.retryOnConflict ?? 0;

      if (item.error?.type === 'version_conflict_engine_exception' && retryOnConflict > attempt) {
        withConflicts.set(originalIndex, { item, originalIndex });
      } else {
        result[originalIndex] = item;
      }
    });

    if (withConflicts.size === 0) {
      break;
    }

    queuedItems = queuedItems?.filter((_, index) => withConflicts.has(index));

    attempt++;
  }
}
