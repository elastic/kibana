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
  assertBulkUpsertSuccess,
  EMPTY_BULK_UPSERT_RESPONSE,
} from '../../lib/bulk_upsert_error';
import {
  toBulkUpsertResponseFromBulk,
  toBulkUpsertResponseFromUpdate,
} from '../../lib/bulk_upsert_response';
import {
  assertUpsertDocumentsHaveIds,
  normalizeUpsertDocuments,
} from '../../lib/normalize_upsert_documents';
import type {
  BulkUpsertIndexResolver,
  BulkUpsertRequest,
  BulkUpsertRequestOptions,
  BulkUpsertResponse,
  UpsertDocument,
} from '../../types';

interface ExecuteIndexBulkUpsertParams<TDoc extends { id: string }> {
  esClient: ElasticsearchClient;
  indexName: BulkUpsertIndexResolver<TDoc>;
  request: BulkUpsertRequest<TDoc>;
}

const resolveBulkUpsertIndexName = <TDoc extends { id: string }>(
  indexName: BulkUpsertIndexResolver<TDoc>,
  document: UpsertDocument<TDoc>
): string => {
  return typeof indexName === 'function' ? indexName(document) : indexName;
};

const allDocumentsShareIndex = <TDoc extends { id: string }>(
  documents: UpsertDocument<TDoc>[],
  indexName: BulkUpsertIndexResolver<TDoc>
): string | undefined => {
  if (documents.length === 0) {
    return undefined;
  }

  const firstIndex = resolveBulkUpsertIndexName(indexName, documents[0]);
  for (const document of documents.slice(1)) {
    if (resolveBulkUpsertIndexName(indexName, document) !== firstIndex) {
      return undefined;
    }
  }

  return firstIndex;
};

const extractBulkUpsertEsOptions = (
  request: BulkUpsertRequestOptions
): Pick<BulkUpsertRequestOptions, 'refresh' | 'pipeline' | 'require_alias' | 'wait_for_active_shards'> => {
  const { refresh = false, pipeline, require_alias, wait_for_active_shards } = request;

  return {
    refresh,
    ...(pipeline !== undefined ? { pipeline } : {}),
    ...(require_alias !== undefined ? { require_alias } : {}),
    ...(wait_for_active_shards !== undefined ? { wait_for_active_shards } : {}),
  };
};

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

  const esOptions = extractBulkUpsertEsOptions(request);

  if (normalizedDocuments.length === 1) {
    const document = normalizedDocuments[0];
    const resolvedIndexName = resolveBulkUpsertIndexName(indexName, document);
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
      const resolvedIndexName = resolveBulkUpsertIndexName(indexName, document);

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
