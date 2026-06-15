/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { BulkRequest, BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { LOOKUP_INDEX_UPDATE_ROUTE } from '@kbn/esql-types';
import { groupBy, chunk } from 'lodash';
import { set } from '@kbn/safer-lodash-set';
import type { HttpStart } from '@kbn/core/public';
import { ROW_PLACEHOLDER_PREFIX } from '../constants';
import type { AddDocAction, DeleteDocAction } from '../types';
import { isDocDelete, isDocUpdate } from '../utils';

export type BulkUpdateOperations = Array<AddDocAction | DeleteDocAction>;

// Update operations will be split in chunks of this size.
export const BULK_UPDATE_CHUNK_SIZE = 500;

/**
 * Sends a bulk update request to an index.
 * @param updates
 */
export async function bulkUpdate(
  indexName: string,
  updates: BulkUpdateOperations,
  http: HttpStart
): Promise<{
  bulkOperations: Exclude<BulkRequest['operations'], undefined>;
  bulkResponse: BulkResponse;
}> {
  const deletingDocIds: string[] = updates
    .filter(isDocDelete)
    .map((v) => v.payload.ids)
    .flat();

  const indexActions = updates.filter(isDocUpdate);

  // First split updates into index and delete operations
  const groupedOperations = groupBy(
    indexActions.map((v) => v.payload),
    (update) => (update.id && !update.id.startsWith(ROW_PLACEHOLDER_PREFIX) ? 'updates' : 'newDocs')
  );

  const updateOperations =
    groupedOperations?.updates?.map((update) => [
      { update: { _id: update.id } },
      { doc: unflattenDoc(update.value) },
    ]) || [];

  const newDocs =
    groupedOperations?.newDocs?.reduce<Record<string, Record<string, any>>>((acc, update) => {
      const docId = update.id || 'new-row';
      acc[docId] = { ...acc[docId], ...update.value };
      return acc;
    }, {}) || {};

  const newDocOperations = Object.entries(newDocs)
    // Filter out new docs that have no fields defined
    .filter(([, doc]) => Object.keys(doc).length > 0)
    .map(([id, doc]) => {
      return [{ index: {} }, unflattenDoc(doc)];
    });

  const operations: BulkRequest['operations'] = [
    ...updateOperations,
    ...newDocOperations,
    ...deletingDocIds.map((id) => {
      return [{ delete: { _id: id } }];
    }),
  ];
  if (!operations.length) {
    return {
      bulkResponse: { errors: false, items: [], took: 0 },
      bulkOperations: [],
    };
  }

  // Split the request on chunks to not exceed the maximum payload size
  const chunks = chunk(operations, BULK_UPDATE_CHUNK_SIZE);
  const responses: BulkResponse[] = [];

  for (const chunkOperations of chunks) {
    const body = JSON.stringify({
      operations: chunkOperations.flat(),
    });

    const response = await http.post<BulkResponse>(
      `${LOOKUP_INDEX_UPDATE_ROUTE}/${encodeURIComponent(indexName)}`,
      {
        body,
      }
    );
    responses.push(response);
  }

  const bulkResponse: BulkResponse = responses.reduce(
    (acc, res) => ({
      took: acc.took + res.took,
      errors: acc.errors || res.errors,
      items: [...acc.items, ...res.items],
    }),
    { took: 0, errors: false, items: [] }
  );

  return {
    bulkResponse,
    bulkOperations: operations,
  };
}

/**
 * Rebuilds a document so dotted field names become nested objects, e.g.
 * `{ 'parent.child': 'value' }` -> `{ parent: { child: 'value' } }`.
 *
 * We receive field names as flattened paths when they are within objects,
 * but when we need to update the document, we need to unflatten them,
 * otherwise they can create a multi-value field.
 */
function unflattenDoc(doc: Record<string, unknown>): Record<string, unknown> {
  return Object.entries(doc).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {});
}
