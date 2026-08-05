/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { estypes } from '@elastic/elasticsearch';

type FieldCapsFieldCapability = estypes.FieldCapsFieldCapability;
type FieldCapsResponse = estypes.FieldCapsResponse;

const toArray = (value: estypes.Indices | undefined): string[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

const dedupe = (values: string[]): string[] => Array.from(new Set(values));

const mergeIndicesList = (
  a: estypes.Indices | undefined,
  b: estypes.Indices | undefined
): estypes.Indices | undefined => {
  const merged = dedupe([...toArray(a), ...toArray(b)]);
  return merged.length > 0 ? merged : undefined;
};

/**
 * Merges the "which indices don't uniformly have this capability" exception list
 * (`non_searchable_indices` / `non_aggregatable_indices`) across two batches.
 *
 * Only `.length > 0` of this list is ever read downstream (see
 * `readFieldCapsResponse`'s `isSearchable`/`isAggregatable`), never the actual
 * index names, so when the two batches disagree on the boolean but neither
 * already carries an exception list (i.e. this is the first time these two
 * batches' views of this field+type collide), it's correct to seed the list
 * with the incoming batch's own matched indices — real data already in hand,
 * not a placeholder — purely so the non-empty-list signal survives the merge.
 */
const mergeExceptionList = (
  existingFlag: boolean,
  existingList: estypes.Indices | undefined,
  incomingFlag: boolean,
  incomingList: estypes.Indices | undefined,
  incomingResponseIndices: estypes.Indices
): estypes.Indices | undefined => {
  const merged = mergeIndicesList(existingList, incomingList);
  if (merged) {
    return merged;
  }
  return existingFlag !== incomingFlag ? dedupe(toArray(incomingResponseIndices)) : undefined;
};

const mergeMetaValues = (
  a?: Record<string, string[]>,
  b?: Record<string, string[]>
): Record<string, string[]> | undefined => {
  if (!a && !b) {
    return undefined;
  }
  const merged: Record<string, string[]> = { ...a };
  for (const [key, values] of Object.entries(b ?? {})) {
    merged[key] = dedupe([...(merged[key] ?? []), ...values]);
  }
  return merged;
};

const agreeOrUndefined = <T>(a: T | undefined, b: T | undefined): T | undefined =>
  a === b ? a : undefined;

/**
 * Merges the same ES type (`esType`) capability object for a field, seen in two
 * different index-chunk batches, into one equivalent to what Elasticsearch would
 * have returned had those indices been queried in a single `_field_caps` call.
 */
const mergeCapability = (
  existing: FieldCapsFieldCapability,
  incoming: FieldCapsFieldCapability,
  incomingResponseIndices: estypes.Indices
): FieldCapsFieldCapability => ({
  ...existing,
  searchable: existing.searchable && incoming.searchable,
  aggregatable: existing.aggregatable && incoming.aggregatable,
  non_searchable_indices: mergeExceptionList(
    existing.searchable,
    existing.non_searchable_indices,
    incoming.searchable,
    incoming.non_searchable_indices,
    incomingResponseIndices
  ),
  non_aggregatable_indices: mergeExceptionList(
    existing.aggregatable,
    existing.non_aggregatable_indices,
    incoming.aggregatable,
    incoming.non_aggregatable_indices,
    incomingResponseIndices
  ),
  indices: mergeIndicesList(existing.indices, incoming.indices),
  meta: mergeMetaValues(existing.meta, incoming.meta),
  // Differing values across batches for the *same* ES type are dropped rather than
  // arbitrarily picking one side, matching how `readFieldCapsResponse` already collapses
  // multiple ES types' values via `uniq(...)` when they disagree.
  time_series_metric: agreeOrUndefined(existing.time_series_metric, incoming.time_series_metric),
  time_series_dimension: agreeOrUndefined(
    existing.time_series_dimension,
    incoming.time_series_dimension
  ),
});

/**
 * Merges multiple `_field_caps` responses — one per URL-length-limited chunk of
 * indices produced by `chunkIndicesForFieldCaps` — into a single response
 * equivalent to what Elasticsearch would have returned for one call across the
 * full, unsplit index set.
 *
 * Responses are merged in call order (not completion order): `readFieldCapsResponse`
 * derives `metadata_field` / `meta.*` / `time_series_dimension` from the *first* ES
 * type key seen for a field, so merge order must be deterministic to match what a
 * real single call would have produced.
 *
 * Accepted trade-off: when two batches disagree about a field's ES type, the merged
 * field correctly ends up with multiple type keys — so `readFieldCapsResponse` still
 * flags it `type: 'conflict'` — but the per-type `indices` list used to build that
 * conflict's `conflictDescriptions` tooltip text may be `undefined` for a type that
 * came from a batch with no internal conflict of its own (already a valid value per
 * the `Indices | undefined` type). This only affects that tooltip's index list, never
 * conflict detection or the search/aggregation-affecting booleans.
 */
export const mergeFieldCapsResponses = (responses: FieldCapsResponse[]): FieldCapsResponse => {
  const indices = dedupe(responses.flatMap((response) => toArray(response.indices)));
  const fields: Record<string, Record<string, FieldCapsFieldCapability>> = {};

  for (const response of responses) {
    for (const [fieldName, typesForField] of Object.entries(response.fields)) {
      const mergedTypesForField = (fields[fieldName] ??= {});

      for (const [esType, capability] of Object.entries(typesForField)) {
        const existing = mergedTypesForField[esType];
        mergedTypesForField[esType] = existing
          ? mergeCapability(existing, capability, response.indices)
          : { ...capability };
      }
    }
  }

  return { indices, fields };
};
