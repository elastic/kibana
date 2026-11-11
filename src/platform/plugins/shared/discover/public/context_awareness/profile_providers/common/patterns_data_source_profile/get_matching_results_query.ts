/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import type { AggregateQuery } from '@kbn/es-query';
import type { DataView } from '@kbn/data-views-plugin/common';
import type { ESQLControlVariable } from '@kbn/esql-types';
import {
  constructCascadeQuery,
  escapeEsqlColumnName,
  escapeStringValue,
  extractCategorizeTokens,
  getCategorizeField,
  prettifyQuery,
} from '@kbn/esql-utils';

const FALLBACK_DOC_LIMIT = 10000;

/**
 * Builds the ES|QL query listing the documents that match a CATEGORIZE pattern, keeping the commands that precede the STATS.
 */
export const getMatchingResultsQuery = ({
  query,
  dataView,
  esqlVariables,
  patternColumn,
  pattern,
}: {
  query: AggregateQuery;
  dataView: DataView;
  esqlVariables: ESQLControlVariable[] | undefined;
  patternColumn: string;
  pattern: string;
}): AggregateQuery | undefined => {
  try {
    const matchingResultsQuery = constructCascadeQuery({
      query,
      dataView,
      esqlVariables,
      nodeType: 'leaf',
      nodePath: [patternColumn],
      nodePathMap: { [patternColumn]: pattern },
    });
    if (matchingResultsQuery) {
      // The cascade query is printed on a single line, wrap it like a query typed in the editor
      return { esql: prettifyQuery(matchingResultsQuery.esql) };
    }
  } catch {
    // The STATS shape is not supported (e.g. CATEGORIZE over a function), use the index-only query below
  }

  const index = dataView.getIndexPattern();
  const tokens = extractCategorizeTokens(pattern).join(' ');
  const [categoryField] = getCategorizeField(query.esql);
  if (!index || !tokens || !categoryField) {
    return undefined;
  }

  return {
    esql: `FROM ${index}\n  | WHERE MATCH(${escapeEsqlColumnName(
      categoryField
    )}, ${escapeStringValue(
      tokens
    )}, {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT ${FALLBACK_DOC_LIMIT}`,
  };
};
