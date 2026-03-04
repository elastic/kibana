/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { ActiveFilters } from '@kbn/content-list-provider';

// ─────────────────────────────────────────────────────────────────────────────
// QueryParser — generic interface for extracting filter values from EUI search
// query text and returning cleaned text + parsed filter state.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result returned by a {@link QueryParser}.
 */
export interface QueryParserResult {
  /**
   * Query text with this parser's field syntax removed.
   *
   * Passed to the next parser in the chain so each parser operates on
   * progressively cleaner text. The final value is used as `filters.search`.
   */
  searchQuery: string;
  /**
   * Filter values extracted by this parser, keyed by filter ID.
   *
   * Merged into the accumulated {@link ActiveFilters} for the current query.
   * Return an empty object when no clauses for this filter type are present —
   * this clears the filter dimension, which is correct since the search bar
   * is the source of truth.
   */
  filters: Partial<ActiveFilters>;
}

/**
 * A parser that extracts one filter dimension from an EUI search bar query string.
 *
 * Parsers are chained by {@link parseFiltersFromQuery} — each receives the
 * cleaned query text produced by the previous parser (with earlier filter
 * syntax already removed), and returns cleaned text + its own parsed filters.
 *
 * @example Implementing a `createdBy` filter parser:
 * ```ts
 * const useCreatedByQueryParser = (): QueryParser | null => {
 *   const userService = useUserProfileService();
 *   return useMemo(() => {
 *     if (!userService) return null;
 *     return {
 *       parse(queryText) {
 *         const { searchQuery, userIds } = userService.parseSearchQuery(queryText);
 *         return {
 *           searchQuery,
 *           filters: userIds?.length ? { createdBy: { include: userIds } } : {},
 *         };
 *       },
 *     };
 *   }, [userService]);
 * };
 * ```
 */
export interface QueryParser {
  parse(queryText: string): QueryParserResult;
}

/**
 * Chains multiple query parsers, passing cleaned text from each to the next.
 *
 * Each parser receives the `searchQuery` produced by the previous parser (with
 * its filter syntax already stripped), and contributes its own filter values to
 * the accumulated result. The pipeline is pure — it does not touch React state.
 *
 * @param queryText - Raw query text from `EuiSearchBar`.
 * @param parsers - Ordered array of parsers to run. Typically one parser per
 *   filter type (tags, users, starred, etc.).
 * @returns The final cleaned `searchQuery` and merged `filters` ready to pass
 *   to `setSearch`.
 *
 * @example
 * ```ts
 * const { searchQuery, filters } = parseFiltersFromQuery(queryText, [tagParser, userParser]);
 * setSearch(queryText, { search: searchQuery.trim() || undefined, ...filters });
 * ```
 */
export const parseFiltersFromQuery = (
  queryText: string,
  parsers: ReadonlyArray<QueryParser>
): QueryParserResult =>
  parsers.reduce<QueryParserResult>(
    (acc, parser) => {
      const result = parser.parse(acc.searchQuery);
      return {
        searchQuery: result.searchQuery,
        filters: { ...acc.filters, ...result.filters },
      };
    },
    { searchQuery: queryText, filters: {} }
  );
