/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';

export interface MultiMatchAnalysis {
  /**
   * Set of unique multi_match query types found in the query
   * e.g., Set(['match_phrase', 'best_fields', 'phrase_prefix'])
   * Note: Both multi_match with type:'phrase' and match_phrase queries
   * are normalized to 'match_phrase' for consistency
   */
  types: Set<string>;
}

/**
 * Analyzes an Elasticsearch query DSL to extract multi_match query types
 * and related phrase query patterns.
 *
 * This function recursively traverses the query DSL tree to identify:
 * - multi_match queries with their type parameter
 * - match_phrase queries (normalized to 'match_phrase' type)
 * - match queries within bool clauses
 *
 * @param query - The Elasticsearch query DSL to analyze
 * @returns MultiMatchAnalysis containing found types
 *
 * @example
 * ```typescript
 * const query = {
 *   bool: {
 *     should: [
 *       { multi_match: { type: 'phrase', query: 'foo bar' } },
 *       { multi_match: { query: 'baz' } } // defaults to best_fields
 *     ]
 *   }
 * };
 *
 * const result = analyzeMultiMatchTypes(query);
 * // result.types: Set(['match_phrase', 'best_fields'])
 * ```
 */
export function analyzeMultiMatchTypes(
  query: QueryDslQueryContainer | undefined
): MultiMatchAnalysis {
  const result: MultiMatchAnalysis = {
    types: new Set(),
  };

  // Handle null/undefined queries
  if (!query) {
    return result;
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
      let type = (multiMatch.type as string) || 'best_fields';
      // Normalize multi_match with type:'phrase' to 'match_phrase' for consistency
      if (type === 'phrase') {
        type = 'match_phrase';
      }
      result.types.add(type);
      return; // Don't recurse further, we've found a leaf query
    }

    // Handle match_phrase queries (normalize to 'match_phrase' type for consistency)
    if ('match_phrase' in nodeObj) {
      result.types.add('match_phrase');
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
