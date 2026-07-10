/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';

import {
  allDocumentsShareIndex,
  extractBulkWriteEsOptions,
  resolveBulkIndexName,
} from './execute_index_bulk_common';
import { assertBulkUpsertSuccess, EMPTY_BULK_UPSERT_RESPONSE } from '../../lib/bulk_upsert_error';
import {
  toBulkUpsertResponseFromBulk,
  toBulkUpsertResponseFromUpdate,
} from '../../lib/bulk_upsert_response';
import {
  assertUpsertDocumentsHaveIds,
  normalizeUpsertDocuments,
} from '../../lib/normalize_upsert_documents';
import type { BulkUpsertIndexResolver, BulkUpsertRequest, BulkUpsertResponse } from '../../types';

interface ExecuteIndexBulkUpsertParams<TDoc extends { id: string }> {
  esClient: ElasticsearchClient;
  indexName: BulkUpsertIndexResolver<TDoc>;
  request: BulkUpsertRequest<TDoc>;
}

export const executeIndexBulkUpsert = async <TDoc extends { id: string }>({
  esClient,
  indexName,
  request,
}: ExecuteIndexBulkUpsertParams<TDoc>): Promise<BulkUpsertResponse> => {
  const normalizedDocuments = normalizeUpsertDocuments(request.documents);

  if (normalizedDocuments.length === 0) {
    return EMPTY_BULK_UPSERT_RESPONSE;
  }

  assertUpsertDocumentsHaveIds(normalizedDocuments);

  const esOptions = extractBulkWriteEsOptions(request);

  if (normalizedDocuments.length === 1) {
    const document = normalizedDocuments[0];
    const resolvedIndexName = resolveBulkIndexName(indexName, document);
    const updateResponse = await esClient.update<TDoc>({
      index: resolvedIndexName,
      id: document.id,
      ...esOptions,
      doc: document,
      doc_as_upsert: true,
    });

    return assertBulkUpsertSuccess(toBulkUpsertResponseFromUpdate(updateResponse, document.id));
  }

  const sharedIndexName = allDocumentsShareIndex(normalizedDocuments, indexName);

  const bulkResponse = await esClient.bulk<TDoc>({
    ...esOptions,
    ...(sharedIndexName !== undefined ? { index: sharedIndexName } : {}),
    operations: normalizedDocuments.flatMap((document) => {
      const resolvedIndexName = resolveBulkIndexName(indexName, document);

      return [
        {
          update: {
            ...(sharedIndexName === undefined ? { _index: resolvedIndexName } : {}),
            _id: document.id,
          },
        },
        { doc: document, doc_as_upsert: true },
      ];
    }),
  });

  return assertBulkUpsertSuccess(toBulkUpsertResponseFromBulk(bulkResponse, normalizedDocuments));
};
