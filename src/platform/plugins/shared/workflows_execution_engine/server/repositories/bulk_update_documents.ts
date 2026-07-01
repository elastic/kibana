/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { delayMs } from '@kbn/occ';
import type { DocumentVersionsById, EsDocumentVersion } from './document_version';
import { extractVersionFromBulkItem, resolveDocumentVersionsByIds } from './document_version';
import { resolveWriteIndex } from './resolve_write_index';

const DEFAULT_RETRY_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_DELAY_MS = 100;

export interface IdentifiedDocument {
  id?: string;
}

export interface DocumentWrite<TDocument extends IdentifiedDocument> {
  doc: TDocument;
  operation: 'update' | 'create';
  version?: EsDocumentVersion;
}

/**
 * Full-jitter exponential backoff: returns a random delay in the range
 * `[0, baseDelayMs * 2 ** (attempt - 1)]`. Jitter spreads concurrent writers
 * apart so they do not retry version conflicts in lockstep.
 */
const getBackoffWithJitterMs = (baseDelayMs: number, attempt: number): number => {
  const exponentialDelayMs = baseDelayMs * 2 ** (attempt - 1);
  return Math.round(Math.random() * exponentialDelayMs);
};

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

/**
 * A `404` / `document_missing_exception` on a conditional update means the
 * caller-provided version pointed at a doc/backing-index that no longer holds
 * it (a stale cache entry). It is retriable: dropping the provided version and
 * re-resolving fresh either finds the doc or surfaces a genuine not-found.
 */
const isBulkDocumentMissing = (item: {
  update?: { status?: number; error?: { type?: string } };
}): boolean =>
  item.update?.status === 404 || item.update?.error?.type === 'document_missing_exception';

/**
 * Both version conflicts and stale-version misses are recoverable by
 * re-resolving fresh versions and retrying the affected docs.
 */
const isRetriableBulkUpdate = (item: {
  update?: { status?: number; error?: { type?: string } };
}): boolean => isBulkVersionConflict(item) || isBulkDocumentMissing(item);

const refreshVersions = async <TDocument extends IdentifiedDocument>({
  esClient,
  dataStreamName,
  entityName,
  writes,
}: {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  entityName: string;
  writes: DocumentWrite<TDocument>[];
}): Promise<void> => {
  if (writes.length === 0) {
    return;
  }

  const writeIndex = await resolveWriteIndex({ esClient, dataStreamName });
  const versions = await resolveDocumentVersionsByIds<TDocument>({
    esClient,
    ids: writes.map(({ doc }) => doc.id as string),
    writeIndex,
    dataStreamName,
    entityName,
  });

  writes.forEach((write) => {
    write.version = versions[write.doc.id as string];
  });
};

/**
 * Uses caller-provided versions where available and resolves fresh versions
 * only for the ids missing from the cache. Skips the `getDataStream` + `mget`
 * round trips entirely when every id is already cached.
 */
const fillMissingVersions = async <TDocument extends IdentifiedDocument>({
  esClient,
  dataStreamName,
  entityName,
  writes: docs,
}: {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  entityName: string;
  writes: DocumentWrite<TDocument>[];
}): Promise<void> => {
  const withoutVersions = docs.filter(({ version }) => !version);
  await refreshVersions({
    esClient,
    dataStreamName,
    entityName,
    writes: withoutVersions,
  });
};

export const bulkUpdateDocuments = async <TDocument extends IdentifiedDocument>({
  esClient,
  dataStreamName,
  writes,
  entityName,
  refresh,
  idRequiredMessage = `${entityName} ID is required for bulk update`,
  failureVerb = 'update',
  retryAttempts = DEFAULT_RETRY_ATTEMPTS,
  retryBaseDelayMs = DEFAULT_RETRY_BASE_DELAY_MS,
}: {
  esClient: ElasticsearchClient;
  dataStreamName: string;
  writes: DocumentWrite<TDocument>[];
  entityName: string;
  refresh: boolean | 'wait_for';
  idRequiredMessage?: string;
  failureVerb?: string;
  retryAttempts?: number;
  retryBaseDelayMs?: number;
}): Promise<DocumentVersionsById> => {
  const resultVersions: DocumentVersionsById = {};
  if (writes.length === 0) {
    return resultVersions;
  }

  writes.forEach(({ doc }) => {
    if (!doc.id) {
      throw new Error(idRequiredMessage);
    }
  });

  let pendingWrites = writes;
  await fillMissingVersions({
    esClient,
    dataStreamName,
    entityName,
    writes: pendingWrites,
  });
  let lastConflictedDocuments: Array<{ id: string; error?: unknown; status?: number }> = [];

  for (let attempt = 1; attempt <= retryAttempts; attempt++) {
    // On retries, back off and re-resolve fresh versions for the conflicted
    // writes; attempt 1 already has versions from the pre-loop fill.
    if (attempt > 1) {
      await delayMs(getBackoffWithJitterMs(retryBaseDelayMs, attempt));
      await refreshVersions({
        esClient,
        dataStreamName,
        entityName,
        writes: pendingWrites,
      });
    }

    const operations = pendingWrites.flatMap(({ doc, version }) => {
      if (!version) {
        return [];
      }

      const id = doc.id as string;

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

    const responseItems = bulkResponse.items ?? [];
    for (const item of responseItems) {
      const captured = extractVersionFromBulkItem(item.update);
      if (captured) {
        resultVersions[captured.id] = captured.version;
      }
    }

    if (!bulkResponse.errors) {
      return resultVersions;
    }

    const fatalErrors = responseItems
      .filter((item) => item.update?.error && !isRetriableBulkUpdate(item))
      .map((item) => ({
        id: item.update?._id,
        error: item.update?.error,
        status: item.update?.status,
      }));

    if (fatalErrors.length > 0) {
      throw new Error(
        `Failed to ${failureVerb} ${fatalErrors.length} ${entityName}s: ${JSON.stringify(
          fatalErrors
        )}`
      );
    }

    lastConflictedDocuments = responseItems
      .filter((item) => item.update?.error && isRetriableBulkUpdate(item))
      .map((item) => ({
        id: item.update?._id as string,
        error: item.update?.error,
        status: item.update?.status,
      }));

    const conflictedIds = new Set(lastConflictedDocuments.map(({ id }) => id));
    pendingWrites = pendingWrites.filter(({ doc }) => doc.id && conflictedIds.has(doc.id));

    if (pendingWrites.length === 0) {
      return resultVersions;
    }
  }

  throw new Error(
    `Failed to ${failureVerb} ${lastConflictedDocuments.length} ${entityName}s: ${JSON.stringify(
      lastConflictedDocuments
    )}`
  );
};
