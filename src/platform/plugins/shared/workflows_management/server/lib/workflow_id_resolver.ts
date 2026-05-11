/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';

import { WorkflowValidationError } from '../../common/lib/errors';
import {
  buildSuffixedCandidate,
  isValidWorkflowId,
  MAX_COLLISION_RETRIES,
} from '../../common/lib/import';

const ES_MAX_IDS_PER_QUERY = 10_000;

/**
 * Callback that checks which of the given candidate IDs already exist.
 * Returns the set of IDs that are taken.
 */
export type CheckExistingIds = (candidateIds: string[]) => Promise<Set<string>>;

/**
 * Validates a user-supplied workflow ID format.
 * Throws `WorkflowValidationError` if the ID is invalid.
 */
export const validateWorkflowId = (id: string): void => {
  if (!isValidWorkflowId(id)) {
    throw new WorkflowValidationError(
      `Invalid workflow ID format. Expected format: lowercase alphanumeric characters with optional hyphens in the middle, received: ${id}`
    );
  }
};

/**
 * Builds the list of candidate IDs for a given base ID:
 * [baseId, baseId-1, baseId-2, ..., baseId-{MAX_COLLISION_RETRIES}].
 * Delegates truncation to `buildSuffixedCandidate` so the rule is shared
 * with the client-side `resolveCollisionId`.
 *
 * When a base ID is near WORKFLOW_ID_MAX_LENGTH and already ends with a
 * hyphen-digit pattern (e.g. `<252 chars>-1`), truncation + re-suffixing
 * can reconstruct the original base, producing a duplicate entry. Duplicates
 * are skipped so every element in the returned array is unique.
 */
export const buildCandidateIds = (baseId: string): string[] => {
  const candidates = [baseId];
  const seen = new Set<string>([baseId]);
  for (let i = 1; i <= MAX_COLLISION_RETRIES; i++) {
    const candidate = buildSuffixedCandidate(baseId, i);
    if (!seen.has(candidate)) {
      seen.add(candidate);
      candidates.push(candidate);
    }
  }
  return candidates;
};

/**
 * Resolves unique workflow IDs for one or more base IDs.
 * Generates candidate IDs for each base (baseId, baseId-1, baseId-2, ...),
 * checks them via the provided `checkExisting` callback, and picks the first
 * available candidate per base ID while also respecting the in-batch `seenIds`
 * set to avoid collisions within the same batch.
 *
 * Chunked to stay within ES default max_result_window (10,000).
 *
 * @mutates seenIds — each resolved ID is added to the set so that callers
 *   sharing the same instance across multiple invocations get cross-batch
 *   deduplication for free.
 */
export const resolveUniqueWorkflowIds = async (
  baseIds: string[],
  seenIds: Set<string>,
  checkExisting: CheckExistingIds
): Promise<string[]> => {
  // Fast path: single ID avoids the Set/chunking overhead on every createWorkflow call.
  if (baseIds.length === 1) {
    const candidates = buildCandidateIds(baseIds[0]);
    const existingIds = await checkExisting(candidates);
    const available = candidates.find((c) => !existingIds.has(c) && !seenIds.has(c));
    const resolvedId = available ?? `workflow-${generateUuid()}`;
    seenIds.add(resolvedId);
    return [resolvedId];
  }

  const candidatesByIndex: string[][] = [];
  const allCandidates = new Set<string>();

  for (const baseId of baseIds) {
    const candidates = buildCandidateIds(baseId);
    candidatesByIndex.push(candidates);
    for (const c of candidates) {
      allCandidates.add(c);
    }
  }

  // Check which candidates already exist, chunked to respect ES limits.
  const candidateArray = [...allCandidates];
  const existingIds = new Set<string>();

  for (let offset = 0; offset < candidateArray.length; offset += ES_MAX_IDS_PER_QUERY) {
    const chunk = candidateArray.slice(offset, offset + ES_MAX_IDS_PER_QUERY);
    const chunkExisting = await checkExisting(chunk);
    for (const id of chunkExisting) {
      existingIds.add(id);
    }
  }

  // Resolve each base ID to the first available candidate
  const resolvedIds: string[] = [];
  for (const candidates of candidatesByIndex) {
    const available = candidates.find((c) => !existingIds.has(c) && !seenIds.has(c));
    const resolvedId = available ?? `workflow-${generateUuid()}`;
    resolvedIds.push(resolvedId);
    seenIds.add(resolvedId);
  }

  return resolvedIds;
};
