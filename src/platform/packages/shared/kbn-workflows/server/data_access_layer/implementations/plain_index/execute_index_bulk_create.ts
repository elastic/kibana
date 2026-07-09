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
import { EMPTY_BULK_UPSERT_RESPONSE } from '../../lib/bulk_upsert_error';
import {
  toBulkUpsertResponseFromBulk,
  toBulkUpsertResponseFromCreate,
  toBulkUpsertResponseFromCreateError,
} from '../../lib/bulk_upsert_response';
import {
  assertUpsertDocumentsHaveIds,
  normalizeUpsertDocuments,
} from '../../lib/normalize_upsert_documents';
import type { BulkCreateRequest, BulkUpsertIndexResolver, BulkUpsertResponse } from '../../types';

interface ExecuteIndexBulkCreateParams<TDoc extends { id: string }> {
  esClient: ElasticsearchClient;
  indexName: BulkUpsertIndexResolver<TDoc>;
  request: BulkCreateRequest<TDoc>;
}

export const executeIndexBulkCreate = async <TDoc extends { id: string }>({
  esClient,
  indexName,
  request,
}: ExecuteIndexBulkCreateParams<TDoc>): Promise<BulkUpsertResponse> => {
  const normalizedDocuments = normalizeUpsertDocuments(request.documents);

  if (normalizedDocuments.length === 0) {
    return EMPTY_BULK_UPSERT_RESPONSE;
  }

  assertUpsertDocumentsHaveIds(normalizedDocuments);

  const esOptions = extractBulkWriteEsOptions(request);

  if (normalizedDocuments.length === 1) {
    const document = normalizedDocuments[0];
    const resolvedIndexName = resolveBulkIndexName(indexName, document);

    try {
      const createResponse = await esClient.create<TDoc>({
        index: resolvedIndexName,
        id: document.id,
        ...esOptions,
        document,
      });

      return toBulkUpsertResponseFromCreate(createResponse, document.id);
    } catch (error: unknown) {
      return toBulkUpsertResponseFromCreateError(error, document.id);
    }
  }

  const sharedIndexName = allDocumentsShareIndex(normalizedDocuments, indexName);

  const bulkResponse = await esClient.bulk<TDoc>({
    ...esOptions,
    ...(sharedIndexName !== undefined ? { index: sharedIndexName } : {}),
    operations: normalizedDocuments.flatMap((document) => {
      const resolvedIndexName = resolveBulkIndexName(indexName, document);

      return [
        {
          create: {
            ...(sharedIndexName === undefined ? { _index: resolvedIndexName } : {}),
            _id: document.id,
          },
        },
        document,
      ];
    }),
  });

  return toBulkUpsertResponseFromBulk(bulkResponse, normalizedDocuments);
};
