/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */
import { uniqBy } from 'lodash';
import type { RecommendedQuery, RecommendedField, ResolveIndexResponse } from '@kbn/esql-types';
import type { KibanaProject as SolutionId } from '@kbn/projects-solutions-groups';
import { getIndexPatternFromESQLQuery } from '@kbn/esql-utils';
import { checkSourceExistence, findMatchingIndicesFromPattern } from './utils';

/**
 * `ESQLExtensionsRegistry` serves as a central hub for managing and retrieving extrensions of the ES|QL editor.
 *
 * It allows for the registration of queries and fields associating them with specific index patterns and solutions.
 * This registry is designed to intelligently provide relevant recommended queries and fields
 * based on the index patterns present in an active ES|QL query or available data sources.
 *
 * The class handles both exact index pattern matches (e.g., "logs-2023-10-01")
 * and wildcard patterns (e.g., "logs*"), ensuring that users receive contextually
 * appropriate suggestions for their data exploration.
 */

export class ESQLExtensionsRegistry {
  private recommendedQueries: Map<string, RecommendedQuery[]> = new Map();
  private recommendedFields: Map<string, RecommendedField[]> = new Map();

  private setRecommendedItems<T extends { name: string }>(
    map: Map<string, T[]>,
    items: T[],
    activeSolutionId: SolutionId,
    getIndexPattern: (item: T) => string | undefined,
    isDuplicate: (existingItems: T[], newItem: T) => boolean,
    itemTypeName: string // e.g., 'query' or 'field' for error messages
  ): void {
    if (!Array.isArray(items)) {
      throw new Error(`Recommended ${itemTypeName}s must be an array`);
    }

    for (const item of items) {
      if (typeof item.name !== 'string') {
        continue; // Skip if the recommended item is malformed (missing name)
      }

      const indexPattern = getIndexPattern(item);
      if (!indexPattern) {
        // No index pattern found, possibly malformed or not valid for registration
        continue;
      }

      // Adding the > as separator to distinguish between solutions and index patterns
      // The > is not a valid character in index names, so it won't conflict with actual index names
      const registryId = `${activeSolutionId}>${indexPattern}`;

      if (map.has(registryId)) {
        const existingItems = map.get(registryId)!;
        if (isDuplicate(existingItems, item)) {
          // If the item already exists, skip adding it again
          continue;
        }
        // If the index pattern already exists, push the new recommended item
        existingItems.push(item);
      } else {
        // If the index pattern doesn't exist, create a new array
        map.set(registryId, [item]);
      }
    }
  }

  private getRecommendedItems<T>(
    map: Map<string, T[]>,
    queryString: string,
    availableDatasources: ResolveIndexResponse,
    activeSolutionId: SolutionId,
    uniqByProperty: keyof T // Property name for lodash's uniqBy
  ): T[] {
    // Validates that the index pattern extracted from the ES|QL `FROM` command
    // exists within the available `sources` (indices, aliases, or data streams).
    // If the specified source isn't found, no recommended queries will be returned.
    const indexPattern = getIndexPatternFromESQLQuery(queryString);
    if (!checkSourceExistence(availableDatasources, indexPattern)) {
      return [];
    }

    const recommendedItems: T[] = [];
    // Determines relevant recommended queries based on the ESQL `FROM` command's index pattern.
    // This includes:
    // 1. **Direct matches**: If the command uses a specific index (e.g., `logs-2023`), it retrieves queries registered for that exact index.
    // 2. **Pattern coverage**: If the command uses a wildcard pattern (e.g., `logs-*`), it returns queries registered for concrete indices that match this pattern (e.g., a recommended query for `logs-2023`).
    // 3. **Reverse coverage**: If the command specifies a concrete index, it also includes queries whose *registered pattern* covers that specific index (e.g., a recommended query for `logs*` would be returned for `logs-2023`).
    const matchingIndices = findMatchingIndicesFromPattern(map, indexPattern);
    if (matchingIndices.length > 0) {
      recommendedItems.push(
        ...matchingIndices
          .map((index) => {
            const registryId = `${activeSolutionId}>${index}`;
            return map.get(registryId) || [];
          })
          .flat()
      );
    }
    return uniqBy(recommendedItems, uniqByProperty);
  }

  setRecommendedQueries(
    recommendedQueries: RecommendedQuery[],
    activeSolutionId: SolutionId
  ): void {
    this.setRecommendedItems(
      this.recommendedQueries,
      recommendedQueries,
      activeSolutionId,
      (recommendedQuery) => {
        // Ensure it has a 'query' property
        if (typeof recommendedQuery.query !== 'string') {
          return undefined;
        }
        return getIndexPatternFromESQLQuery(recommendedQuery.query);
      },
      (existingQueries, newQuery) => existingQueries.some((q) => q.query === newQuery.query),
      'query'
    );
  }

  getRecommendedQueries(
    queryString: string,
    availableDatasources: ResolveIndexResponse,
    activeSolutionId: SolutionId
  ): RecommendedQuery[] {
    return this.getRecommendedItems(
      this.recommendedQueries,
      queryString,
      availableDatasources,
      activeSolutionId,
      'query'
    );
  }

  setRecommendedFields(recommendedFields: RecommendedField[], activeSolutionId: SolutionId): void {
    this.setRecommendedItems(
      this.recommendedFields,
      recommendedFields,
      activeSolutionId,
      (field) => {
        // Ensure it has a 'pattern' property
        if (typeof field.pattern !== 'string') {
          return undefined;
        }
        return field.pattern;
      },
      (existingFields, newField) => existingFields.some((f) => f.name === newField.name),
      'field'
    );
  }

  getRecommendedFields(
    queryString: string,
    availableDatasources: ResolveIndexResponse,
    activeSolutionId: SolutionId
  ): RecommendedField[] {
    return this.getRecommendedItems(
      this.recommendedFields,
      queryString,
      availableDatasources,
      activeSolutionId,
      'name'
    );
  }
}
