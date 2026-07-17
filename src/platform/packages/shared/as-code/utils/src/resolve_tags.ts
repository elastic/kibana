/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { tagsToFindOptions } from '@kbn/content-management-utils';

const normalize = (value?: string | string[]): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

/**
 * Resolves tag names to saved-object IDs in the current space.
 * When multiple tags share a name, all matching IDs are returned (union).
 * Uses `search`/`searchFields` to pre-filter server-side, then filters to exact-name matches;
 * perPage:1000 covers all practical spaces; add pagination if telemetry shows > 1000 tags/space.
 */
const resolveTagNamesToIds = async (
  names: string[],
  soClient: SavedObjectsClientContract
): Promise<string[]> => {
  if (names.length === 0) return [];
  const nameSet = new Set(names);
  const response = await soClient.find<{ name: string }>({
    type: 'tag',
    perPage: 1000,
    searchFields: ['name'],
    search: names.map((n) => `"${n}"`).join(' '),
    defaultSearchOperator: 'OR',
    fields: ['name'],
  });
  // SO find uses fuzzy text search. Filter results to exact matches on the names in the nameSet.
  return response.saved_objects.filter((so) => nameSet.has(so.attributes.name)).map((so) => so.id);
};

/**
 * Resolves raw tag search params into SO find options (`hasReference` / `hasNoReference`).
 * Accepts both ID-based (`tags`, `excluded_tags`) and name-based (`tag_names`, `excluded_tag_names`) params.
 * Returns `null` when an include filter was requested but no matching tags exist — callers should
 * short-circuit and return an empty result set rather than issuing an unfiltered SO query.
 */
export const resolveTagsToFindOptions = async (
  params: {
    tags?: string | string[];
    excluded_tags?: string | string[];
    tag_names?: string | string[];
    excluded_tag_names?: string | string[];
  },
  soClient: SavedObjectsClientContract
): Promise<ReturnType<typeof tagsToFindOptions> | null> => {
  const included = normalize(params.tags);
  const excluded = normalize(params.excluded_tags);
  const tagNamesRequested = normalize(params.tag_names).length > 0;
  const [resolvedNameIds, resolvedExcludedNameIds] = await Promise.all([
    resolveTagNamesToIds(normalize(params.tag_names), soClient),
    resolveTagNamesToIds(normalize(params.excluded_tag_names), soClient),
  ]);
  const allIncluded = [...included, ...resolvedNameIds];
  if (tagNamesRequested && allIncluded.length === 0) return null;
  const allExcluded = [...excluded, ...resolvedExcludedNameIds];
  return tagsToFindOptions({
    included: allIncluded.length > 0 ? allIncluded : undefined,
    excluded: allExcluded.length > 0 ? allExcluded : undefined,
  });
};
