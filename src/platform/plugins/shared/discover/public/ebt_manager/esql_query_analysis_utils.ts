/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { Request as InspectedRequest } from '@kbn/inspector-plugin/public';
import { EsqlQuery, Walker } from '@kbn/esql-language';
import type { ESQLFunction } from '@kbn/esql-language';
import { z } from '@kbn/zod/v4';

/**
 * Analysis result for MATCH/MATCH_PHRASE functions found in ES|QL queries.
 * @public
 */
export interface EsqlMatchAnalysis {
  /**
   * Count of phrase queries found in the ES|QL query.
   * This includes only MATCH_PHRASE() functions.
   */
  phraseQueryCount: number;

  /**
   * Array of MATCH function types found in the query:
   * - 'match': MATCH() function (regardless of operator option)
   * - 'match_phrase': MATCH_PHRASE() function
   */
  matchTypes: string[];
}

/**
 * Analyzes an ES|QL query string to extract MATCH and MATCH_PHRASE function usage.
 *
 * This function parses the ES|QL query and walks the AST to identify:
 * - MATCH() functions
 * - MATCH_PHRASE() functions
 *
 * Only MATCH_PHRASE is counted as a phrase query. MATCH with operator:"AND" is
 * treated as a regular MATCH query.
 *
 * @param esqlQuery - The ES|QL query string to analyze
 * @returns EsqlMatchAnalysis containing phrase query count and match types
 *
 * @example
 * ```TypeScript
 * const query = 'FROM logs | WHERE MATCH(message, "error") AND MATCH_PHRASE(host, "server1")';
 * const result = analyzeEsqlMatchFunctions(query);
 * // result: {
 * //   phraseQueryCount: 1,  // Only MATCH_PHRASE counts as phrase
 * //   matchTypes: ['match', 'match_phrase']
 * // }
 * ```
 *
 * @example
 * ```TypeScript
 * const query = 'FROM logs | WHERE MATCH(message, "error", {"operator": "AND"})';
 * const result = analyzeEsqlMatchFunctions(query);
 * // result: {
 * //   phraseQueryCount: 0,  // MATCH with operator:"AND" is NOT a phrase query
 * //   matchTypes: ['match']
 * // }
 * ```
 *
 * @internal
 */
export function analyzeEsqlMatchFunctions(esqlQuery: string): EsqlMatchAnalysis {
  const result: EsqlMatchAnalysis = {
    phraseQueryCount: 0,
    matchTypes: [],
  };

  // Handle empty queries
  if (!esqlQuery || esqlQuery.trim() === '') {
    return result;
  }

  try {
    // Parse the ES|QL query
    const query = EsqlQuery.fromSrc(esqlQuery);

    // Walk the AST to find MATCH and MATCH_PHRASE functions
    Walker.walk(query.ast, {
      visitFunction: (node: ESQLFunction) => {
        const functionName = node.name.toLowerCase();

        if (functionName === 'match') {
          // All MATCH functions are tracked as 'match', regardless of operator
          result.matchTypes.push('match');
        } else if (functionName === 'match_phrase') {
          // Only MATCH_PHRASE counts as a phrase query
          result.phraseQueryCount++;
          result.matchTypes.push('match_phrase');
        }
      },
    });
  } catch (error) {
    // If parsing fails, return empty result
    // Fail silently to not break telemetry
    return result;
  }

  return result;
}

/**
 * Analyzes an inspected request to determine the MATCH functions present in its ES|QL query.
 *
 * @param request - The inspected request object containing the JSON body to be analyzed
 * @returns The result of analyzing the ES|QL query, or empty result if the request body is invalid
 *
 * @internal
 */
export function analyzeEsqlMatchRequest(request: InspectedRequest): EsqlMatchAnalysis {
  const maybeRequestBody = RequestWithEsqlQuery.safeParse(request.json);

  return analyzeEsqlMatchFunctions(maybeRequestBody.success ? maybeRequestBody.data.query : '');
}

/**
 * Merges multiple EsqlMatchAnalysis results into a single consolidated analysis.
 *
 * @param analyses - Array of EsqlMatchAnalysis results to merge
 * @returns A single EsqlMatchAnalysis representing the merged results
 *
 * @example
 * ```TypeScript
 * const analysis1 = { phraseQueryCount: 2, matchTypes: ['match', 'match_phrase'] };
 * const analysis2 = { phraseQueryCount: 1, matchTypes: ['match_and'] };
 * const merged = mergeEsqlMatchAnalyses([analysis1, analysis2]);
 * // merged: {
 * //   phraseQueryCount: 3,
 * //   matchTypes: ['match', 'match_phrase', 'match_and']
 * // }
 * ```
 *
 * @internal
 */
export function mergeEsqlMatchAnalyses(analyses: EsqlMatchAnalysis[]): EsqlMatchAnalysis {
  return analyses.reduce(
    (merged, analysis) => {
      merged.phraseQueryCount += analysis.phraseQueryCount;
      merged.matchTypes.push(...analysis.matchTypes);
      return merged;
    },
    {
      phraseQueryCount: 0,
      matchTypes: [],
    } as EsqlMatchAnalysis
  );
}

/**
 * Zod schema for ES|QL request body validation.
 * ES|QL requests have a 'query' field containing the ES|QL query string.
 */
const RequestWithEsqlQuery = z.object({
  query: z.string(),
});
