/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { checkSourceExistence } from './utils';
import type { ResolveIndexResponse } from './types';

interface RecommendedQuery {
  name: string;
  query: string;
}

export class ESQLExtensionsRegistry {
  private recommendedQueries: Map<string, RecommendedQuery[]> = new Map();

  async setRecommendedQueries(recommendedQueries: RecommendedQuery[]) {
    if (!Array.isArray(recommendedQueries)) {
      throw new Error('Recommended queries must be an array');
    }
    for (const recommendedQuery of recommendedQueries) {
      if (typeof recommendedQuery.name !== 'string' || typeof recommendedQuery.query !== 'string') {
        throw new Error('Each recommended query must have a name and a query string');
      }
      const indexPattern = getIndexPatternFromESQLQuery(recommendedQuery.query);
      if (!indexPattern) {
        // No index pattern found for query, possibly malformed or not ES|QL
        continue;
      }

      if (this.recommendedQueries.has(indexPattern)) {
        const existingQueries = this.recommendedQueries.get(indexPattern);
        // check if the recommended query already exists
        if (existingQueries && existingQueries.some((q) => q.query === recommendedQuery.query)) {
          // If the query already exists, skip adding it again
          continue;
        }
        // If the index pattern already exists, push the new recommended query
        this.recommendedQueries.get(indexPattern)!.push(recommendedQuery);
      } else {
        // If the index pattern doesn't exist, create a new array
        this.recommendedQueries.set(indexPattern, [recommendedQuery]);
      }
    }
  }

  getRecommendedQueries(queryString: string, sources: ResolveIndexResponse): RecommendedQuery[] {
    // check that the sources contain the index pattern from the query string
    const indexPattern = getIndexPatternFromESQLQuery(queryString);
    if (!checkSourceExistence(sources, indexPattern)) {
      return [];
    }
    const recommendedQueries = this.recommendedQueries.get(indexPattern);
    return recommendedQueries ?? [];
  }
}
