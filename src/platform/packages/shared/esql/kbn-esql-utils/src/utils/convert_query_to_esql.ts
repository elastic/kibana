/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { type Query, escapeQuotes } from '@kbn/es-query';

/**
 * Converts a KQL or Lucene query into an ES|QL expression that can be used inside a WHERE
 * clause. KQL maps to the `KQL(...)` function and Lucene maps to `QSTR(...)`.
 *
 * Returns an empty string when the query is missing, has no body, or uses an unsupported
 * language.
 */
export const convertQueryToESQLExpression = (query?: Query): string => {
  if (!query) {
    return '';
  }
  const searchTextFunc =
    query.language === 'kuery' ? 'KQL' : query.language === 'lucene' ? 'QSTR' : '';

  if (searchTextFunc && query.query) {
    const escapedQuery =
      typeof query.query === 'string' && query.language === 'lucene'
        ? escapeQuotes(query.query)
        : query.query;
    return `${searchTextFunc}("""${escapedQuery}""")`;
  }
  return '';
};
