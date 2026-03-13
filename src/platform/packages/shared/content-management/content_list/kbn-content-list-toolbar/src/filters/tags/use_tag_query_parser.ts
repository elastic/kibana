/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { useTagServices } from '@kbn/content-management-tags';
import type { QueryParser, QueryParserResult } from '../query_parser';

/**
 * Returns a {@link QueryParser} that extracts `tag:name` and `-tag:name` clauses
 * from the search bar query text and maps them to `filters.tag` include/exclude lists.
 *
 * Returns `null` when no tag service is registered — the toolbar skips this
 * parser and the query text is passed through unchanged.
 *
 * Used by {@link ContentListToolbar}'s `handleSearchChange` pipeline. Register
 * additional parsers alongside this one (e.g. `useUserQueryParser`) to support
 * more filter types without modifying `handleSearchChange`.
 */
export const useTagQueryParser = (): QueryParser | null => {
  const tagServices = useTagServices();

  return useMemo((): QueryParser | null => {
    if (!tagServices?.parseSearchQuery) {
      return null;
    }

    const { parseSearchQuery } = tagServices;

    return {
      parse(queryText: string): QueryParserResult {
        const { searchQuery, tagIds, tagIdsToExclude } = parseSearchQuery(queryText);
        const hasTags =
          (tagIds && tagIds.length > 0) || (tagIdsToExclude && tagIdsToExclude.length > 0);

        return {
          searchQuery,
          // Return an empty object when no tag clauses are present — this correctly
          // clears any existing tag filter, since the search bar is the source of truth.
          filters: hasTags
            ? { tag: { include: tagIds ?? [], exclude: tagIdsToExclude ?? [] } }
            : {},
        };
      },
    };
  }, [tagServices]);
};
