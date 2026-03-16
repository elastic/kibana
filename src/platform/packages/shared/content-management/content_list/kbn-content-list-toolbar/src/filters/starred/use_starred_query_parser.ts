/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { useMemo } from 'react';
import { Query } from '@elastic/eui';
import { useFilterDisplay } from '@kbn/content-list-provider';
import type { QueryParser, QueryParserResult } from '../query_parser';

/**
 * Returns a {@link QueryParser} that extracts `is:starred` from the search bar
 * query text and maps it to `filters.starredOnly`.
 *
 * Returns `null` when starred is not supported — the toolbar skips this parser
 * and the query text is passed through unchanged.
 *
 * Used by {@link ContentListToolbar}'s `handleSearchChange` pipeline.
 */
export const useStarredQueryParser = (): QueryParser | null => {
  const { hasStarred } = useFilterDisplay();

  return useMemo((): QueryParser | null => {
    if (!hasStarred) {
      return null;
    }

    return {
      parse(queryText: string): QueryParserResult {
        const query = Query.parse(queryText);
        const hasClause = query.hasIsClause('starred');
        const searchQuery = hasClause ? query.removeIsClause('starred').text : queryText;

        return {
          searchQuery,
          filters: { starredOnly: hasClause },
        };
      },
    };
  }, [hasStarred]);
};
