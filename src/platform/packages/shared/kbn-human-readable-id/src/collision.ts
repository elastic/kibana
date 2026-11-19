/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { HUMAN_READABLE_ID_MAX_LENGTH, MAX_COLLISION_RETRIES } from './constants';

/**
 * Builds a single suffixed candidate ID from a base ID and a numeric index.
 * Truncates the base when appending the suffix would exceed HUMAN_READABLE_ID_MAX_LENGTH
 * and strips trailing hyphens to prevent invalid double-hyphen sequences.
 */
export const buildSuffixedCandidate = (baseId: string, index: number): string => {
  const suffix = `-${index}`;
  return `${baseId
    .slice(0, HUMAN_READABLE_ID_MAX_LENGTH - suffix.length)
    .replace(/-+$/, '')}${suffix}`;
};

/**
 * Builds the list of candidate IDs for a given base ID:
 * [baseId, baseId-1, baseId-2, ..., baseId-{MAX_COLLISION_RETRIES}].
 *
 * When a base ID is near HUMAN_READABLE_ID_MAX_LENGTH and already ends with a
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
 * Resolves a non-colliding ID by appending a numeric suffix (-1, -2, ...).
 * Returns the first ID that is not in `conflictIds`, or falls back to `fallbackId`.
 */
export const resolveCollisionId = (
  baseId: string,
  conflictIds: ReadonlySet<string>,
  fallbackId: string
): string => {
  if (!conflictIds.has(baseId)) {
    return baseId;
  }
  for (let i = 1; i <= MAX_COLLISION_RETRIES; i++) {
    const candidate = buildSuffixedCandidate(baseId, i);
    if (!conflictIds.has(candidate)) {
      return candidate;
    }
  }
  return fallbackId;
};
