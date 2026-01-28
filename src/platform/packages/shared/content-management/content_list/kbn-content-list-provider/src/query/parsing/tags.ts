/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';

/** Tag structure returned by `getTagList`. */
export interface TagItem {
  id?: string;
  name: string;
}

/** Result of extracting tags from query text. */
export interface ExtractTagsResult {
  /** Tag IDs to include in results. */
  tagIds: string[] | undefined;
  /** Tag IDs to exclude from results. */
  tagIdsToExclude: string[] | undefined;
  /** Query text with tag clauses removed. */
  cleanText: string;
}

/**
 * Resolves tag names to tag IDs using the provided tag list.
 *
 * @param tagNames - Array of tag names to resolve.
 * @param tagList - The list of available tags to match against.
 * @returns Array of resolved tag IDs.
 */
const resolveTagNamesToIds = (tagNames: unknown[], tagList: TagItem[]): string[] => {
  const tagIds: string[] = [];
  tagNames.forEach((tagName) => {
    // Validate tag name format before lookup to prevent potential injection.
    // Tag names should be non-empty strings.
    if (typeof tagName !== 'string' || tagName.trim().length === 0) {
      return;
    }
    const tag = tagList.find((t) => t.name === tagName);
    if (tag?.id) {
      tagIds.push(tag.id);
    }
  });
  return tagIds;
};

/**
 * Extracts tag filters from query text and resolves tag names to IDs.
 *
 * Parses `tag:name` syntax from the query, resolves tag names to their IDs
 * using the provided tag list, and returns the cleaned query text.
 *
 * @param queryText - The search query text to parse.
 * @param tagList - The list of available tags for name-to-ID resolution.
 * @returns Extracted tag IDs and cleaned query text.
 *
 * @example
 * ```ts
 * const tagList = [{ id: 'tag-1', name: 'Important' }];
 * const result = extractTags('tag:Important dashboard', tagList);
 * // { tagIds: ['tag-1'], tagIdsToExclude: undefined, cleanText: 'dashboard' }
 * ```
 */
export const extractTags = (queryText: string, tagList: TagItem[]): ExtractTagsResult => {
  try {
    // Use `strict: false` to allow other field clauses (`createdBy`, `is:starred`, etc.)
    // while still extracting tag clauses.
    const query = Query.parse(queryText, {
      schema: { strict: false, fields: { tag: { type: 'string' } } },
    });

    const tagIds: string[] = [];
    const tagIdsToExclude: string[] = [];

    // Handle regular field clauses (e.g., `tag:value`).
    const tagClauses = query.ast.getFieldClauses('tag');
    if (tagClauses) {
      tagClauses.forEach((clause) => {
        const tagNames = Array.isArray(clause.value) ? clause.value : [clause.value];
        const resolvedIds = resolveTagNamesToIds(tagNames, tagList);

        if (clause.match === 'must') {
          tagIds.push(...resolvedIds);
        } else if (clause.match === 'must_not') {
          tagIdsToExclude.push(...resolvedIds);
        }
      });
    }

    // Handle OR-field clauses (e.g., `tag:(value)` or `tag:(value1 or value2)`).
    // EUI Query treats parenthesis syntax differently from simple field syntax.
    const includeOrClause = query.ast.getOrFieldClause('tag', undefined, true, 'eq');
    if (includeOrClause) {
      const tagNames = Array.isArray(includeOrClause.value)
        ? includeOrClause.value
        : [includeOrClause.value];
      const resolvedIds = resolveTagNamesToIds(tagNames, tagList);
      tagIds.push(...resolvedIds);
    }

    const excludeOrClause = query.ast.getOrFieldClause('tag', undefined, false, 'eq');
    if (excludeOrClause) {
      const tagNames = Array.isArray(excludeOrClause.value)
        ? excludeOrClause.value
        : [excludeOrClause.value];
      const resolvedIds = resolveTagNamesToIds(tagNames, tagList);
      tagIdsToExclude.push(...resolvedIds);
    }

    // Deduplicate tag IDs since the same tag may be matched by both
    // getFieldClauses and getOrFieldClause for certain query formats.
    const uniqueTagIds = [...new Set(tagIds)];
    const uniqueTagIdsToExclude = [...new Set(tagIdsToExclude)];

    const cleanQuery = query.removeOrFieldClauses('tag');
    const hasResolvedTags = uniqueTagIds.length > 0 || uniqueTagIdsToExclude.length > 0;

    if (!hasResolvedTags) {
      return { tagIds: undefined, tagIdsToExclude: undefined, cleanText: queryText };
    }

    return {
      tagIds: uniqueTagIds.length > 0 ? uniqueTagIds : undefined,
      tagIdsToExclude: uniqueTagIdsToExclude.length > 0 ? uniqueTagIdsToExclude : undefined,
      cleanText: cleanQuery.text,
    };
  } catch (error) {
    // Log parsing errors in development mode to help debug issues.
    if (process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[extractTags] Tag query parsing error:', error, { queryText });
    }
    return { tagIds: undefined, tagIdsToExclude: undefined, cleanText: queryText };
  }
};
