/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type {
  SavedObjectsClientContract,
  SavedObjectsFindOptions,
  SavedObjectsFindResponse,
} from '@kbn/core-saved-objects-api-server';
import type { asCodeSearchRequestSchema } from '@kbn/as-code-shared-schemas';
import { PAGINATION_DEFAULT_PER_PAGE } from '@kbn/as-code-shared-schemas';
import type { TypeOf } from '@kbn/config-schema';
import { tagsToFindOptions } from '@kbn/content-management-utils';

type TagSearchParams = Pick<
  TypeOf<typeof asCodeSearchRequestSchema>,
  'tags' | 'excluded_tags' | 'tag_names' | 'excluded_tag_names'
>;

const normalize = (value?: string | string[]): string[] => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

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
 * Returns `null` when an include filter was requested but no matching tags exist — signalling that no
 * object can match. Internal to `findWithTagFilter`, which handles the `null` case.
 */
const resolveTagsToFindOptions = async (
  params: TagSearchParams,
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

/**
 * Runs a SO `find` with tag filtering resolved from search params. When `tag_names` were requested
 * but matched no tags, returns an empty response instead of querying — so callers never special-case
 * that: the empty result flows through their normal response mapping.
 */
export const findWithTagFilter = async <T>(
  soClient: SavedObjectsClientContract,
  findOptions: SavedObjectsFindOptions,
  tagParams: TagSearchParams
): Promise<SavedObjectsFindResponse<T>> => {
  const tagsFindOptions = await resolveTagsToFindOptions(tagParams, soClient);
  if (tagsFindOptions === null) {
    return {
      saved_objects: [],
      total: 0,
      page: findOptions.page ?? 1,
      per_page: findOptions.perPage ?? PAGINATION_DEFAULT_PER_PAGE,
    };
  }
  return soClient.find<T>({ ...findOptions, ...tagsFindOptions });
};
