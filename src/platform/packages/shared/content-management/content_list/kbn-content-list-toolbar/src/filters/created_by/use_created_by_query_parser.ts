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
 * Returns a {@link QueryParser} that strips `createdBy:` field clauses from
 * the search-bar query text so they are not forwarded to the backend as
 * plain-text search terms.
 *
 * The actual UID resolution is handled by {@link useCreatedByQueryResolver},
 * which reads the full `Query` object directly — this parser only cleans the
 * text that reaches `FindItemsParams.searchQuery`.
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
          let query = Query.parse(queryText);

          const hasSimple = (query.ast.getFieldClauses(FIELD_NAME)?.length ?? 0) > 0;
          const hasOrInclude = !!query.ast.getOrFieldClause(FIELD_NAME, undefined, true, 'eq');
          const hasOrExclude = !!query.ast.getOrFieldClause(FIELD_NAME, undefined, false, 'eq');

          if (!hasSimple && !hasOrInclude && !hasOrExclude) {
            return { searchQuery: queryText, filters: {} };
          }

          query = query.removeSimpleFieldClauses(FIELD_NAME).removeOrFieldClauses(FIELD_NAME);
          return { searchQuery: query.text, filters: {} };
        } catch {
          return { searchQuery: queryText, filters: {} };
        }
      },
    };
  }, [isSupported]);
};
