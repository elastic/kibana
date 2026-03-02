/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import type { ContentManagementTagsServices, ParsedQuery, Tag } from '@kbn/content-management-tags';
import { MOCK_TAGS } from './tags';

/**
 * Mock favorites client for testing favorites filtering in stories.
 * Returns a static set of favorited item IDs.
 */
export const mockFavoritesClient = {
  getFavorites: async () => ({
    favoriteIds: ['dashboard-001', 'dashboard-003', 'vis-001', 'map-001'],
  }),
};

// =============================================================================
// Mock Tags Service
// =============================================================================

const resolveTagNamesToIds = (tagNames: string[], tags: Tag[]): string[] =>
  tagNames.reduce<string[]>((ids, name) => {
    const tag = tags.find((t) => t.name === name);
    if (tag?.id) {
      ids.push(tag.id);
    }
    return ids;
  }, []);

/**
 * Parses EUI query syntax to extract `tag:Name` and `-tag:Name` clauses,
 * resolving tag names against {@link MOCK_TAGS}.
 *
 * **Approximation only.** This mirrors the real `parseSearchQueryCore` from
 * `@kbn/content-management-tags` closely enough for Storybook demos, but it
 * reimplements the parsing logic and may diverge on edge cases (e.g. quoting,
 * partial matches, case sensitivity). Production behavior should always be
 * verified against the real implementation.
 */
const parseSearchQuery = (searchQuery: string): ParsedQuery => {
  const tags = MOCK_TAGS;
  const query = Query.parse(searchQuery, {
    schema: { strict: false, fields: { tag: { type: 'string' } } },
  });

  const tagIds: string[] = [];
  const tagIdsToExclude: string[] = [];

  const tagClauses = query.ast.getFieldClauses('tag');
  if (tagClauses) {
    tagClauses.forEach((clause) => {
      const names = Array.isArray(clause.value) ? clause.value : [clause.value];
      const resolved = resolveTagNamesToIds(names as string[], tags);
      if (clause.match === 'must') {
        tagIds.push(...resolved);
      } else if (clause.match === 'must_not') {
        tagIdsToExclude.push(...resolved);
      }
    });
  }

  const includeOr = query.ast.getOrFieldClause('tag', undefined, true, 'eq');
  if (includeOr) {
    const names = Array.isArray(includeOr.value) ? includeOr.value : [includeOr.value];
    tagIds.push(...resolveTagNamesToIds(names as string[], tags));
  }

  const excludeOr = query.ast.getOrFieldClause('tag', undefined, false, 'eq');
  if (excludeOr) {
    const names = Array.isArray(excludeOr.value) ? excludeOr.value : [excludeOr.value];
    tagIdsToExclude.push(...resolveTagNamesToIds(names as string[], tags));
  }

  const unique = [...new Set(tagIds)];
  const uniqueExclude = [...new Set(tagIdsToExclude)];
  const hasResolved = unique.length > 0 || uniqueExclude.length > 0;

  if (!hasResolved) {
    return { searchQuery, tagIds: undefined, tagIdsToExclude: undefined };
  }

  return {
    searchQuery: query.removeOrFieldClauses('tag').text,
    tagIds: unique.length > 0 ? unique : undefined,
    tagIdsToExclude: uniqueExclude.length > 0 ? uniqueExclude : undefined,
  };
};

/**
 * Pre-configured mock tags service backed by {@link MOCK_TAGS}.
 *
 * Provides `getTagList` and `parseSearchQuery` ready for use as
 * `services.tags` on `ContentListProvider`.
 */
export const mockTagsService: ContentManagementTagsServices = {
  getTagList: () => MOCK_TAGS,
  parseSearchQuery,
};
