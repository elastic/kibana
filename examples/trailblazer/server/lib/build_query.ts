/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import { fromKueryExpression, toElasticsearchQuery } from '@kbn/es-query';
import type { QueryLanguage } from '../../common';

export class QueryParseError extends Error {}

/** Converts query bar input in the given language into an Elasticsearch query clause. */
export function buildQuery(language: QueryLanguage, query: string): QueryDslQueryContainer {
  const trimmed = query.trim();
  if (trimmed === '') {
    return { match_all: {} };
  }

  try {
    switch (language) {
      case 'kql':
        return toElasticsearchQuery(fromKueryExpression(trimmed));
      case 'lucene':
        return { query_string: { query: trimmed } };
      case 'dsl':
        return parseDsl(trimmed);
    }
  } catch (error) {
    if (error instanceof QueryParseError) throw error;
    throw new QueryParseError(error instanceof Error ? error.message : String(error));
  }
}

function parseDsl(text: string): QueryDslQueryContainer {
  const parsed: unknown = JSON.parse(text);
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new QueryParseError('Query DSL must be a JSON object, for example {"match_all": {}}');
  }
  return parsed as QueryDslQueryContainer;
}
