/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveDocumentVersionsByIds } from './document_version';
import { resolveWriteIndex } from './resolve_write_index';

const DEFAULT_RETRY_ATTEMPTS = 3;

export interface IdentifiedDocument {
  id?: string;
}

export const isVersionConflictError = (error: unknown): boolean => {
  const maybeError = error as {
    type?: string;
    body?: { error?: { type?: string } };
    meta?: { body?: { error?: { type?: string } }; statusCode?: number };
    statusCode?: number;
  };

  return (
    maybeError?.type === 'version_conflict_engine_exception' ||
    maybeError?.body?.error?.type === 'version_conflict_engine_exception' ||
    maybeError?.meta?.body?.error?.type === 'version_conflict_engine_exception' ||
    maybeError?.statusCode === 409 ||
    maybeError?.meta?.statusCode === 409
  );
};

const isBulkVersionConflict = (item: {
  update?: { status?: number; error?: { type?: string } };
}): boolean =>
  item.update?.status === 409 || item.update?.error?.type === 'version_conflict_engine_exception';

export const bulkUpdateDocuments = async <TDocument extends IdentifiedDocument>({
  esClient,
  dataStreamName,
  docs,
  entityName,
  refresh,
  idRequiredMessage = `${entityName} ID is required for bulk update`,
  failureVerb = 'update',
  retryAttempts = DEFAULT_RETRY_ATTEMPTS,
}: {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  docs: TDocument[];
  entityName: string;
  refresh: boolean | 'wait_for';
  idRequiredMessage?: string;
  failureVerb?: string;
  retryAttempts?: number;
}): Promise<void> => {
  if (docs.length === 0) {
    return;
  }

  docs.forEach((doc) => {
    if (!doc.id) {
      throw new Error(idRequiredMessage);
    }
  });

  let pendingDocs = docs;
  let lastConflictedDocuments: Array<{ id: string; error?: unknown; status?: number }> = [];

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    const writeIndex = await resolveWriteIndex({ esClient, dataStreamName });
    const versions = await resolveDocumentVersionsByIds<TDocument>({
      esClient,
      ids: pendingDocs.map(({ id }) => id as string),
      writeIndex,
      dataStreamName,
      entityName,
    });

    const operations = pendingDocs.flatMap((doc) => {
      const id = doc.id as string;
      const version = versions[id];
      return [
        {
          update: {
            _index: version.index,
            _id: id,
            if_seq_no: version.seqNo,
            if_primary_term: version.primaryTerm,
          },
        },
        { doc },
      ];
    });

    const bulkResponse = await esClient.bulk({
      refresh,
      operations,
    });

    if (!bulkResponse.errors) {
      return;
    }

    const nonConflictErrors = bulkResponse.items
      .filter((item) => item.update?.error && !isBulkVersionConflict(item))
      .map((item) => ({
        id: item.update?._id,
        error: item.update?.error,
        status: item.update?.status,
      }));

    if (nonConflictErrors.length > 0) {
      throw new Error(
        `Failed to ${failureVerb} ${nonConflictErrors.length} ${entityName}s: ${JSON.stringify(
          nonConflictErrors
        )}`
      );
    }

    lastConflictedDocuments = bulkResponse.items
      .filter((item) => item.update?.error && isBulkVersionConflict(item))
      .map((item) => ({
        id: item.update?._id as string,
        error: item.update?.error,
        status: item.update?.status,
      }));

    const conflictedIds = new Set(lastConflictedDocuments.map(({ id }) => id));
    pendingDocs = pendingDocs.filter(({ id }) => id && conflictedIds.has(id));
    if (pendingDocs.length === 0) {
      return;
    }
  }

  throw new Error(
    `Failed to ${failureVerb} ${lastConflictedDocuments.length} ${entityName}s: ${JSON.stringify(
      lastConflictedDocuments
    )}`
  );
};
