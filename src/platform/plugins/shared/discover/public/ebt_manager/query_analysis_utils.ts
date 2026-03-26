/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request as InspectedRequest } from '@kbn/inspector-plugin/public';
import { z } from '@kbn/zod/v4';

/**
 * Analysis result for multi_match query types found in ES query DSL.
 * @public
 */
export interface MultiMatchAnalysis {
  /**
   * Map of normalized multi_match query types to their occurrence counts
   * e.g., Map([['match_phrase', 3], ['best_fields', 2]])
   * Note: Both multi_match with type:'phrase' and match_phrase queries
   * are normalized to 'match_phrase' for the counts
   */
  typeCounts: Map<string, number>;

  /**
   * Array of all query types found, in their original non-normalized form
   * e.g., ['phrase', 'phrase', 'match_phrase', 'best_fields']
   * This preserves the distinction between multi_match type:'phrase' and match_phrase queries
   */
  rawTypes: string[];
}

/**
 * Analyzes an Elasticsearch query DSL to extract multi_match query types
 * and count their occurrences.
 *
 * This function recursively traverses the query DSL tree to identify and count:
 * - multi_match queries with their type parameter
 * - match_phrase queries (normalized to 'match_phrase' type)
 *
 * @param query - The Elasticsearch query DSL to analyze
 * @returns MultiMatchAnalysis containing type counts
 *
 * @example
 * ```typescript
 * const query = {
 *   bool: {
 *     must: [
 *       { multi_match: { type: 'phrase', query: 'foo bar' } },
 *       { multi_match: { type: 'phrase', query: 'baz qux' } },
 *       { multi_match: { query: 'test' } } // defaults to best_fields
 *     ]
 *   }
 * };
 *
 * const result = analyzeMultiMatchTypes(query);
 * // result.typeCounts: Map([['match_phrase', 2], ['best_fields', 1]])
 * ```
 *
 * @internal
 */
export function analyzeMultiMatchTypesQuery(query: object | undefined): MultiMatchAnalysis {
  const result: MultiMatchAnalysis = {
    typeCounts: new Map(),
    rawTypes: [],
  };

  // Handle null/undefined queries
  if (!query) {
    return result;
  }

  // Helper to track both normalized counts and raw types
  function trackType(rawType: string, normalizedType: string): void {
    // Add to raw types array (non-normalized)
    result.rawTypes.push(rawType);

    // Increment normalized type count
    const currentCount = result.typeCounts.get(normalizedType) || 0;
    result.typeCounts.set(normalizedType, currentCount + 1);
  }

  // Recursively visits nodes in the query DSL tree
  function visit(node: unknown): void {
    // Skip non-object nodes
    if (!node || typeof node !== 'object') {
      return;
    }

    const nodeObj = node as Record<string, unknown>;

    // Handle multi_match queries
    if ('multi_match' in nodeObj && typeof nodeObj.multi_match === 'object') {
      const multiMatch = nodeObj.multi_match as Record<string, unknown>;
      // Default to 'best_fields' if type is not specified (ES default behavior)
      const rawType = (multiMatch.type as string) || 'best_fields';

      // Normalize 'phrase' to 'match_phrase' for counting
      const normalizedType = rawType === 'phrase' ? 'match_phrase' : rawType;

      trackType(rawType, normalizedType);
      return; // Don't recurse further, we've found a leaf query
    }

    // Handle match_phrase queries
    if ('match_phrase' in nodeObj) {
      trackType('match_phrase', 'match_phrase');
      return; // Don't recurse further, we've found a leaf query
    }

    // Handle bool queries - recurse into all clause types
    if ('bool' in nodeObj && typeof nodeObj.bool === 'object') {
      const bool = nodeObj.bool as Record<string, unknown>;
      // Elasticsearch bool query supports: must, should, filter, must_not
      ['must', 'should', 'filter', 'must_not'].forEach((clause) => {
        const clauseValue = bool[clause];
        if (Array.isArray(clauseValue)) {
          clauseValue.forEach(visit);
        } else if (clauseValue) {
          visit(clauseValue);
        }
      });
      return; // Already handled bool recursion, don't continue
    }

    // Handle nested queries - recurse into the nested query
    if ('nested' in nodeObj && typeof nodeObj.nested === 'object') {
      const nested = nodeObj.nested as Record<string, unknown>;
      if (nested.query) {
        visit(nested.query);
      }
      return; // Already handled nested recursion, don't continue
    }

    // For other query types (term, range, exists, etc.), don't recurse
    // We only care about multi_match and match_phrase queries
  }

  visit(query);
  return result;
}

/**
 * Analyzes an inspected request to determine the types of multi-match queries present within its body.
 *
 * @param request - The inspected request object containing the JSON body to be analyzed.
 * @returns The result of analyzing the query for multi-match types, or the result of analyzing `undefined` if the request body is invalid.
 */
export function analyzeMultiMatchTypesRequest(request: InspectedRequest) {
  const maybeRequestBody = RequestWithQuery.safeParse(request.json);

  return analyzeMultiMatchTypesQuery(
    maybeRequestBody.success ? maybeRequestBody.data.query : undefined
  );
}

/**
 * Merges multiple MultiMatchAnalysis results into a single consolidated analysis by adding up
 * the counts for each multi_match type and concatenating the raw types arrays.
 * @param analyses - Array of MultiMatchAnalysis results to merge
 * @returns A single MultiMatchAnalysis representing the merged results
 */
export function mergeMultiMatchAnalyses(analyses: MultiMatchAnalysis[]): MultiMatchAnalysis {
  return analyses.reduce(
    (merged, analysis) => {
      // Merge type counts
      analysis.typeCounts.forEach((count, type) => {
        const currentCount = merged.typeCounts.get(type) ?? 0;
        merged.typeCounts.set(type, currentCount + count);
      });

      // Concatenate raw types
      merged.rawTypes.push(...analysis.rawTypes);

      return merged;
    },
    {
      typeCounts: new Map(),
      rawTypes: [],
    } as MultiMatchAnalysis
  );
}

const RequestWithQuery = z.object({
  query: z.record(z.string(), z.unknown()),
});
