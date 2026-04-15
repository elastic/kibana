/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { v4 as generateUuid } from 'uuid';
import { toSlugIdentifier } from '@kbn/std';
import { WORKFLOW_ID_MAX_LENGTH } from '@kbn/workflows';

import { WorkflowValidationError } from '../../common/lib/errors';
import { isValidWorkflowId } from '../../common/lib/import';

const MAX_COLLISION_RETRIES = 100;
const ES_MAX_IDS_PER_QUERY = 10_000;

/**
 * Callback that checks which of the given candidate IDs already exist.
 * Returns the set of IDs that are taken.
 */
export type CheckExistingIds = (candidateIds: string[]) => Promise<Set<string>>;

/**
 * Generates a slug-based workflow ID from a name, or falls back to a UUID-based ID.
 */
export const generateWorkflowId = (name?: string): string => {
  if (name) {
    const slug = toSlugIdentifier(name);
    if (isValidWorkflowId(slug)) {
      return slug;
    }
  }
  return `workflow-${generateUuid()}`;
};

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
 * Truncates the base when appending a suffix would exceed WORKFLOW_ID_MAX_LENGTH.
 */
export const buildCandidateIds = (baseId: string): string[] => {
  const candidates = [baseId];
  for (let i = 1; i <= MAX_COLLISION_RETRIES; i++) {
    const suffix = `-${i}`;
    candidates.push(`${baseId.slice(0, WORKFLOW_ID_MAX_LENGTH - suffix.length)}${suffix}`);
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
 */
export const resolveUniqueWorkflowIds = async (
  baseIds: string[],
  seenIds: Set<string>,
  checkExisting: CheckExistingIds
): Promise<string[]> => {
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
