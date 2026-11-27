/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryTemplate } from '@kbn/esql-language';

export const MAX_RECOMMENDED_QUERIES = 6;

/** KQL and unmapped fields need an Elasticsearch index, so a federated dataset cannot run them. */
const needsIndex = (query: QueryTemplate) => /KQL\s*\(|unmapped_fields/i.test(query.queryString);

export const selectRecommendedQueries = ({
  extensionQueries,
  staticQueries,
  federatedOnly = false,
}: {
  extensionQueries: readonly QueryTemplate[];
  staticQueries: readonly QueryTemplate[];
  federatedOnly?: boolean;
}): QueryTemplate[] => {
  // Solution extensions target indices such as metrics-* and logs-*.
  const extensions = federatedOnly ? [] : extensionQueries;
  const templates = federatedOnly
    ? staticQueries.filter((query) => !needsIndex(query))
    : staticQueries;

  return [...extensions, ...templates].slice(0, MAX_RECOMMENDED_QUERIES);
};
