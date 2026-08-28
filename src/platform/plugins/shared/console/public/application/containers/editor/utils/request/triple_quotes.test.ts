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

describe('triple quote request data', () => {
  const input = `{
  "query1": """FROM sample_data | LIMIT 3""",
  "query2": """
    FROM sample_data
    | WHERE message LIKE "Connected*"
    | SORT @timestamp DESC
    """
}`;

  describe('WHEN collapsing complete triple-quoted strings', () => {
    it('SHOULD preserve their order for expansion', () => {
      const { collapsedTripleQuotesData, tripleQuoteStrings } = collapseTripleQuoteStrings(input);

      expect(collapsedTripleQuotesData).toBe(`{
  "query1": ${TRIPLE_QUOTE_STRINGS_MARKER},
  "query2": ${TRIPLE_QUOTE_STRINGS_MARKER}
}`);
      expect(tripleQuoteStrings).toEqual([
        '"""FROM sample_data | LIMIT 3"""',
        `"""
    FROM sample_data
    | WHERE message LIKE "Connected*"
    | SORT @timestamp DESC
    """`,
      ]);
      expect(expandTripleQuoteStrings(collapsedTripleQuotesData, tripleQuoteStrings)).toBe(input);
    });
  });

  describe('WHEN collapsing data twice', () => {
    it('SHOULD leave already-collapsed data unchanged', () => {
      const firstCollapse = collapseTripleQuoteStrings(input);
      const secondCollapse = collapseTripleQuoteStrings(firstCollapse.collapsedTripleQuotesData);

      expect(secondCollapse.tripleQuoteStrings).toEqual([]);
      expect(secondCollapse.collapsedTripleQuotesData).toBe(
        firstCollapse.collapsedTripleQuotesData
      );
    });
  });

  describe('WHEN the triple quote is unclosed', () => {
    it('SHOULD preserve the source', () => {
      const unclosed = '{\n  "script": """return 1;\n}';
      const { collapsedTripleQuotesData, tripleQuoteStrings, marker } =
        collapseTripleQuoteStrings(unclosed);

      expect(collapsedTripleQuotesData).toBe(unclosed);
      expect(tripleQuoteStrings).toEqual([]);
      expect(expandTripleQuoteStrings(collapsedTripleQuotesData, tripleQuoteStrings, marker)).toBe(
        unclosed
      );
    });
  });

  describe('WHEN the normal marker collides with source values', () => {
    it('SHOULD choose a distinct marker and restore every value', () => {
      const source = [
        '{',
        '// "{tripleQuoteString}"',
        '"literal":"\\u007btripleQuoteString_0}",',
        '"script":"""return 1;"""',
        '}',
      ].join('\n');
      const collapsed = collapseTripleQuoteStrings(source);

      expect(collapsed.marker).toBe('"{tripleQuoteString_1}"');
      expect(
        expandTripleQuoteStrings(
          collapsed.collapsedTripleQuotesData,
          collapsed.tripleQuoteStrings,
          collapsed.marker
        )
      ).toBe(source);
    });
  });
});
