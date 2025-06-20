/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import type { RecommendedQuery, ResolveIndexResponse } from '@kbn/esql-types';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { checkSourceExistence, findMatchingIndicesFromPattern } from './utils';

/**
 * `ESQLExtensionsRegistry` serves as a central hub for managing and retrieving extrensions of the ES|QL editor.
 *
 * It allows for the registration of queries, associating them with specific index patterns and solutions.
 * This registry is designed to intelligently provide relevant recommended queries
 * based on the index patterns present in an active ES|QL query or available data sources.
 *
 * The class handles both exact index pattern matches (e.g., "logs-2023-10-01")
 * and wildcard patterns (e.g., "logs*"), ensuring that users receive contextually
 * appropriate suggestions for their data exploration.
 */

export class ESQLExtensionsRegistry {
  private recommendedQueries: Map<string, RecommendedQuery[]> = new Map();

  setRecommendedQueries(
    recommendedQueries: RecommendedQuery[],
    activeSolutionId: SolutionId
  ): void {
    if (!Array.isArray(recommendedQueries)) {
      throw new Error('Recommended queries must be an array');
    }
    for (const recommendedQuery of recommendedQueries) {
      if (typeof recommendedQuery.name !== 'string' || typeof recommendedQuery.query !== 'string') {
        continue; // Skip if the recommended query is malformed
      }
      const indexPattern = getIndexPatternFromESQLQuery(recommendedQuery.query);
      if (!indexPattern) {
        // No index pattern found for query, possibly malformed or not ES|QL
        continue;
      }

      // Adding the > as separator to distinguish between solutions and index patterns
      // The > is not a valid character in index names, so it won't conflict with actual index names
      const registryId = `${activeSolutionId}>${indexPattern}`;

      if (this.recommendedQueries.has(registryId)) {
        const existingQueries = this.recommendedQueries.get(registryId);
        // check if the recommended query already exists
        if (existingQueries && existingQueries.some((q) => q.query === recommendedQuery.query)) {
          // If the query already exists, skip adding it again
          continue;
        }
        // If the index pattern already exists, push the new recommended query
        this.recommendedQueries.get(registryId)!.push(recommendedQuery);
      } else {
        // If the index pattern doesn't exist, create a new array
        this.recommendedQueries.set(registryId, [recommendedQuery]);
      }
    }
  }

  getRecommendedQueries(
    queryString: string,
    availableDatasources: ResolveIndexResponse,
    activeSolutionId: SolutionId
  ): RecommendedQuery[] {
    // Validates that the index pattern extracted from the ES|QL `FROM` command
    // exists within the available `sources` (indices, aliases, or data streams).
    // If the specified source isn't found, no recommended queries will be returned.
    const indexPattern = getIndexPatternFromESQLQuery(queryString);
    if (!checkSourceExistence(availableDatasources, indexPattern)) {
      return [];
    }

    const recommendedQueries: RecommendedQuery[] = [];

    // Determines relevant recommended queries based on the ESQL `FROM` command's index pattern.
    // This includes:
    // 1. **Direct matches**: If the command uses a specific index (e.g., `logs-2023`), it retrieves queries registered for that exact index.
    // 2. **Pattern coverage**: If the command uses a wildcard pattern (e.g., `logs-*`), it returns queries registered for concrete indices that match this pattern (e.g., a recommended query for `logs-2023`).
    // 3. **Reverse coverage**: If the command specifies a concrete index, it also includes queries whose *registered pattern* covers that specific index (e.g., a recommended query for `logs*` would be returned for `logs-2023`).
    const matchingIndices = findMatchingIndicesFromPattern(this.recommendedQueries, indexPattern);
    if (matchingIndices.length > 0) {
      recommendedQueries.push(
        ...matchingIndices
          .map((index) => {
            const registryId = `${activeSolutionId}>${index}`;
            return this.recommendedQueries.get(registryId) || [];
          })
          .flat()
      );
    }
    return uniqBy(recommendedQueries, 'query');
  }
}
