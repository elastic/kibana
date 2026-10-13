/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { RecommendedQueryItem } from './recommended_queries';

export const MAX_RECOMMENDED_QUERIES = 6;

// Keeps the basics visible when a source matches many extension queries.
const RESERVED_STATIC_QUERIES = 2;

export const selectRecommendedQueries = ({
  extensionQueries,
  staticQueries,
  sourceCommand,
}: {
  extensionQueries: readonly RecommendedQueryItem[];
  staticQueries: readonly RecommendedQueryItem[];
  sourceCommand: string;
}): RecommendedQueryItem[] => {
  // The static queries are FROM queries, so TS sources give the slots to their own extension queries.
  const reservedSlots =
    sourceCommand === 'FROM' ? Math.min(RESERVED_STATIC_QUERIES, staticQueries.length) : 0;

  return [
    ...extensionQueries.slice(0, MAX_RECOMMENDED_QUERIES - reservedSlots),
    ...staticQueries,
  ].slice(0, MAX_RECOMMENDED_QUERIES);
};
