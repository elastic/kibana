/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { Query } from '@elastic/eui';
import { extractTags, type TagItem, type ExtractTagsResult } from './tags';
import { extractStarred } from './starred';
import { extractUsers } from './users';
import { extractCustomFilters } from './custom';
import { extractCleanSearch } from './search';
import { buildQuerySchema, getAllCustomFilterKeys } from './schema';
import type { FilteringConfig } from '../../features/filtering';

/** Result of parsing a complete query text. */
export interface ParseQueryTextResult {
  /** Tag IDs to include in results. */
  tagIds: string[] | undefined;
  /** Tag IDs to exclude from results. */
  tagIdsToExclude: string[] | undefined;
  /** Whether starred filter is active. */
  starredOnly: boolean;
  /** User identifiers to filter by. */
  users: string[] | undefined;
  /** Custom filter values by field name. */
  customFilters: Record<string, string[]>;
  /** Clean search text with all filter syntax removed. */
  cleanSearchQuery: string | undefined;
}

/** Options for `parseQueryText`. */
export interface ParseQueryTextOptions {
  /** Tag list for name-to-ID resolution. */
  tagList?: TagItem[];
  /** Filtering configuration for custom filters. */
  filteringConfig?: FilteringConfig;
  /** Whether to log parsing errors in development mode. */
  logErrors?: boolean;
}

/**
 * Parses complete query text and extracts all filter types.
 *
 * This is the main orchestrator that:
 * 1. Extracts tags (requires tag list for name→ID resolution).
 * 2. Parses the remaining text for starred, users, and custom filters.
 * 3. Returns clean search text with all filter syntax removed.
 *
 * @param queryText - The search query text to parse.
 * @param options - Parsing options including tag list and filtering config.
 * @returns All extracted filters and clean search text.
 *
 * @example
 * ```ts
 * const result = parseQueryText('tag:Important is:starred createdBy:alice dashboard', {
 *   tagList: [{ id: 'tag-1', name: 'Important' }],
 *   filteringConfig: { users: true },
 * });
 * // {
 * //   tagIds: ['tag-1'],
 * //   starredOnly: true,
 * //   users: ['alice'],
 * //   cleanSearchQuery: 'dashboard',
 * //   ...
 * // }
 * ```
 */
export const parseQueryText = (
  queryText: string | undefined,
  options: ParseQueryTextOptions = {}
): ParseQueryTextResult => {
  const { tagList, filteringConfig, logErrors = false } = options;

  // Default result for empty query.
  if (!queryText) {
    return {
      tagIds: undefined,
      tagIdsToExclude: undefined,
      starredOnly: false,
      users: undefined,
      customFilters: {},
      cleanSearchQuery: undefined,
    };
  }

  // Step 1: Extract tags first (they need special handling for name→ID resolution).
  let tagResult: ExtractTagsResult = {
    tagIds: undefined,
    tagIdsToExclude: undefined,
    cleanText: queryText,
  };

  if (tagList && tagList.length > 0) {
    tagResult = extractTags(queryText, tagList);
  }

  // Step 2: Parse the remaining text for other filters.
  const customFilterKeys = getAllCustomFilterKeys(filteringConfig);
  const querySchema = buildQuerySchema(customFilterKeys, { strict: false });

  try {
    const query = Query.parse(tagResult.cleanText, { schema: querySchema });

    const starredOnly = extractStarred(query);
    const users = extractUsers(query);
    const customFilters = extractCustomFilters(query, customFilterKeys);
    const cleanSearchQuery = extractCleanSearch(query);

    return {
      tagIds: tagResult.tagIds,
      tagIdsToExclude: tagResult.tagIdsToExclude,
      starredOnly,
      users,
      customFilters,
      cleanSearchQuery,
    };
  } catch (error) {
    // Log parsing errors in development mode to help debug issues.
    if (logErrors && process.env.NODE_ENV === 'development') {
      // eslint-disable-next-line no-console
      console.warn('[parseQueryText] Query parsing error:', error, {
        queryText,
        customFilterKeys,
      });
    }
    return {
      tagIds: tagResult.tagIds,
      tagIdsToExclude: tagResult.tagIdsToExclude,
      starredOnly: false,
      users: undefined,
      customFilters: {},
      cleanSearchQuery: tagResult.cleanText,
    };
  }
};

// Re-export individual extractors and utilities for direct use.
export { extractTags, type TagItem, type ExtractTagsResult } from './tags';
export { extractStarred } from './starred';
export { extractUsers } from './users';
export { extractCustomFilters } from './custom';
export { extractCleanSearch } from './search';
export { buildQuerySchema, getAllCustomFilterKeys, type QuerySchema } from './schema';
export { sanitizeFilterValue, sanitizeFilterValues } from './sanitize';
