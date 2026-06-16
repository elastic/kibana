/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';
import type { Logger } from '@kbn/core/server';
import { DEFAULT_MAX_RETRIES, DEFAULT_RETRY_DELAY_MS, OCC_CONFLICT_STATUS_CODE } from '@kbn/occ';

import { extractBulkItemError } from './bulk_response_helpers';
import type { WorkflowProperties, WorkflowStorage } from '../../storage/workflow_storage';

export interface OccWorkflowHit {
  _id: string;
  _source: WorkflowProperties;
  seqNo: number;
  primaryTerm: number;
}

type WorkflowStorageClient = ReturnType<WorkflowStorage['getClient']>;

interface BulkIndexItem {
  index?: { _id?: string | null; status?: number; error?: estypes.ErrorCause };
}

const delay = async (ms: number): Promise<void> => {
  if (ms <= 0) {
    return;
  }
  await new Promise((resolve) => setTimeout(resolve, ms));
};

const toOccHit = (hit: {
  _id: string;
  _source: WorkflowProperties;
  _seq_no?: number;
  _primary_term?: number;
}): OccWorkflowHit => {
  if (hit._seq_no == null || hit._primary_term == null) {
    throw new Error(`Missing seq_no/primary_term for workflow ${hit._id}`);
  }

  return {
    _id: hit._id,
    _source: hit._source,
    seqNo: hit._seq_no,
    primaryTerm: hit._primary_term,
  };
};

const buildBulkIndexOperations = (
  hits: OccWorkflowHit[],
  mutate: (source: WorkflowProperties) => WorkflowProperties
) =>
  hits.map((hit) => ({
    index: {
      _id: hit._id,
      if_seq_no: hit.seqNo,
      if_primary_term: hit.primaryTerm,
      document: mutate(hit._source),
    },
  }));

const refreshOccHits = async (
  client: WorkflowStorageClient,
  ids: string[]
): Promise<OccWorkflowHit[]> => {
  const refreshed = await Promise.all(
    ids.map(async (id) => {
      try {
        const document = await client.get({ id, seq_no_primary_term: true });
        return toOccHit({
          _id: document._id,
          _source: document._source as WorkflowProperties,
          _seq_no: document._seq_no,
          _primary_term: document._primary_term,
        });
      } catch {
        return null;
      }
    })
  );

  return refreshed.filter((hit): hit is OccWorkflowHit => hit != null);
};

/**
 * Bulk-indexes documents with per-item OCC, retrying only 409 conflicts after a fresh read.
 */
export const bulkIndexWithOccRetry = async ({
  client,
  hits,
  mutate,
  logger,
  maxRetries = DEFAULT_MAX_RETRIES,
  retryDelayMs = DEFAULT_RETRY_DELAY_MS,
  refresh = true,
}: {
  client: WorkflowStorageClient;
  hits: OccWorkflowHit[];
  mutate: (source: WorkflowProperties) => WorkflowProperties;
  logger?: Logger;
  maxRetries?: number;
  retryDelayMs?: number;
  refresh?: boolean;
}): Promise<{ successIds: string[]; failures: Array<{ id: string; error: string }> }> => {
  const successIds: string[] = [];
  const failures: Array<{ id: string; error: string }> = [];
  let pendingHits = hits;
  const maxAttempts = 1 + maxRetries;

  for (let attempt = 1; attempt <= maxAttempts && pendingHits.length > 0; attempt++) {
    const bulkResponse = await client.bulk({
      operations: buildBulkIndexOperations(pendingHits, mutate),
      refresh,
    });

    const conflictIds: string[] = [];

    for (let itemIndex = 0; itemIndex < bulkResponse.items.length; itemIndex++) {
      const item = bulkResponse.items[itemIndex] as BulkIndexItem;
      const operation = item.index;
      const hit = pendingHits[itemIndex];

      if (operation && hit) {
        if (!operation.error) {
          if (operation._id) {
            successIds.push(operation._id);
          }
        } else if (operation.status === OCC_CONFLICT_STATUS_CODE && attempt < maxAttempts) {
          conflictIds.push(hit._id);
        } else {
          failures.push({
            id: operation._id ?? hit._id,
            error: extractBulkItemError(operation.error),
          });
        }
      }
    }

    if (conflictIds.length === 0) {
      break;
    }

    logger?.debug(
      `Bulk OCC conflict for ${conflictIds.length} workflow(s), retrying (attempt ${attempt}/${maxAttempts})`
    );
    await delay(retryDelayMs);

    const refreshedHits = await refreshOccHits(client, conflictIds);
    const refreshedIds = new Set(refreshedHits.map((hit) => hit._id));

    for (const conflictId of conflictIds) {
      if (!refreshedIds.has(conflictId)) {
        failures.push({
          id: conflictId,
          error: `Workflow with id ${conflictId} not found during OCC retry`,
        });
      }
    }

    pendingHits = refreshedHits;
  }

  return { successIds, failures };
};

export { toOccHit };
