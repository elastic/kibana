/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { dataViewMock } from '@kbn/discover-utils/src/__mocks__';
import { getMatchingResultsQuery } from './get_matching_results_query';

describe('getMatchingResultsQuery', () => {
  it('keeps the commands preceding the STATS and filters on the pattern tokens', () => {
    const result = getMatchingResultsQuery({
      query: {
        esql: 'FROM logs-* | WHERE service.name == "checkout" | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message) | SORT Count DESC',
      },
      dataView: dataViewMock,
      esqlVariables: [],
      patternColumn: 'Pattern',
      pattern: '.*?payment.+?failed.*?',
    });

    expect(result).toEqual({
      esql: 'FROM logs-* | WHERE service.name == "checkout" | WHERE MATCH(message, "payment failed", {"auto_generate_synonyms_phrase_query": FALSE, "fuzziness": 0, "operator": "AND"})',
    });
  });

  it('falls back to an index-only query with an escaped pattern when the pattern column cannot be traced back', () => {
    const result = getMatchingResultsQuery({
      query: {
        esql: 'FROM logs-* | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(message) | RENAME Pattern AS p',
      },
      dataView: dataViewMock,
      esqlVariables: [],
      patternColumn: 'p',
      pattern: '.*?say.+?"hi".*?',
    });

    expect(result).toEqual({
      esql: 'FROM the-data-view-title\n  | WHERE MATCH(message, "say \\"hi\\"", {"auto_generate_synonyms_phrase_query": false, "fuzziness": 0, "operator": "AND"})\n  | LIMIT 10000',
    });
  });

  it('returns undefined when the categorized field is not a column', () => {
    const result = getMatchingResultsQuery({
      query: {
        esql: 'FROM logs-* | STATS Count = COUNT(*) BY Pattern = CATEGORIZE(TO_LOWER(message))',
      },
      dataView: dataViewMock,
      esqlVariables: [],
      patternColumn: 'Pattern',
      pattern: '.*?payment.*?',
    });

    expect(result).toBeUndefined();
  });
});
