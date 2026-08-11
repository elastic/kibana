/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  collapseTripleQuoteStrings,
  expandTripleQuoteStrings,
  TRIPLE_QUOTE_STRINGS_MARKER,
} from './triple_quotes';

describe('triple_quotes', () => {
  describe('collapseTripleQuoteStrings and expandTripleQuoteStrings', () => {
    const input = `{
  "query1": """FROM sample_data | LIMIT 3""",
  "query2": """
    FROM sample_data
    | WHERE message LIKE "Connected*"
    | SORT @timestamp DESC
    """
}`;

    it('should collapse and re-expand both inline and multi-line triple-quote strings correctly', () => {
      const { collapsedTripleQuotesData, tripleQuoteStrings } = collapseTripleQuoteStrings(input);

      // Validate that both triple-quoted strings were replaced with the marker
      expect(collapsedTripleQuotesData).toBe(`{
  "query1": ${TRIPLE_QUOTE_STRINGS_MARKER},
  "query2": ${TRIPLE_QUOTE_STRINGS_MARKER}
}`);

      // Validate extracted strings match expected format
      expect(tripleQuoteStrings).toEqual([
        `"""FROM sample_data | LIMIT 3"""`,
        `"""
    FROM sample_data
    | WHERE message LIKE "Connected*"
    | SORT @timestamp DESC
    """`,
      ]);

      // Ensure re-expansion gives the original input back
      const expanded = expandTripleQuoteStrings(collapsedTripleQuotesData, tripleQuoteStrings);
      expect(expanded).toBe(input);
    });

    it('should be idempotent if run multiple times on collapsed data', () => {
      const firstCollapse = collapseTripleQuoteStrings(input);
      const secondCollapse = collapseTripleQuoteStrings(firstCollapse.collapsedTripleQuotesData);

      expect(secondCollapse.tripleQuoteStrings).toEqual([]);
      expect(secondCollapse.collapsedTripleQuotesData).toBe(
        firstCollapse.collapsedTripleQuotesData
      );
    });
  });
});
