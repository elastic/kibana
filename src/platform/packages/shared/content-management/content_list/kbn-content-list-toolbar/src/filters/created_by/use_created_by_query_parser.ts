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
import { useContentListUserFilter } from '@kbn/content-list-provider';
import type { QueryParser, QueryParserResult } from '../query_parser';

const FIELD_NAME = 'createdBy';

/**
 * Returns a {@link QueryParser} that strips `createdBy:value` clauses from the
 * search bar query text so they are not treated as plain-text search terms.
 *
 * The actual UID mapping (email/name → user ID) is handled by
 * {@link CreatedByRenderer}, which reads the `query` prop from `EuiSearchBar`
 * and syncs selections to the provider via `setSelectedUsers`. This parser only
 * needs to clean the text — it returns an empty `filters` object because the
 * renderer owns the `filters.user` state.
 *
 * Returns `null` when created-by filtering is not supported, causing the
 * toolbar to skip this parser entirely.
 */
export const useCreatedByQueryParser = (): QueryParser | null => {
  const { isSupported } = useContentListUserFilter();

  return useMemo((): QueryParser | null => {
    if (!isSupported) {
      return null;
    }

    return {
      parse(queryText: string): QueryParserResult {
        try {
          const query = Query.parse(queryText);
          const clauses = query.ast.getFieldClauses(FIELD_NAME);

          if (!clauses || clauses.length === 0) {
            return { searchQuery: queryText, filters: {} };
          }

          const cleaned = query
            .removeSimpleFieldClauses(FIELD_NAME)
            .removeOrFieldClauses(FIELD_NAME);

          return { searchQuery: cleaned.text, filters: {} };
        } catch {
          return { searchQuery: queryText, filters: {} };
        }
      },
    };
  }, [isSupported]);
};
