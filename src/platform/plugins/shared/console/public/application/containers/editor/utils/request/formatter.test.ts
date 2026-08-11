/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatRequestData } from './formatter';
import { TRIPLE_QUOTE_STRINGS_MARKER } from './triple_quotes';

describe('request formatter', () => {
  describe('WHEN data contains supported comments', () => {
    it('SHOULD retain all comment kinds while formatting', () => {
      const formatted = formatRequestData('{\n# hash\n"a":1, /* block */\n"b":2\n}');

      expect(formatted).toContain('# hash');
      expect(formatted).toContain('/* block */');
      expect(formatted).toMatch(/\n  "a": 1/);
      expect(formatted).toMatch(/\n  "b": 2/);
    });

    it('SHOULD move commas before chained comments', () => {
      const formatted = formatRequestData('{\n"a":1// one\n/* two */\n,"b":2\n}');

      expect(formatted).toContain('// one');
      expect(formatted).toContain('/* two */');
      expect(formatted).toMatch(/\n  "a": 1/);
      expect(formatted).toMatch(/\n  "b": 2/);
    });
  });

  describe('WHEN standalone comments have stale indentation', () => {
    it('SHOULD re-indent them to the depth of the code they precede', () => {
      const formatted = formatRequestData(
        '{\n"query": {\n# match every document\n"match_all": {}\n},\n        // deep note\n"size": 10\n}'
      );

      expect(formatted).toBe(
        [
          '{',
          '  "query": {',
          '    # match every document',
          '    "match_all": {',
          '    }',
          '  },',
          '  // deep note',
          '  "size": 10',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD attach comments that end a block to the preceding value', () => {
      // Hjson emits a comment that is the last thing in a block as a trailing
      // comment of the previous value, so it never becomes a standalone line.
      const formatted = formatRequestData('{\n"a": {\n"b": 1\n// last in block\n}\n# last\n}');

      expect(formatted).toBe(
        ['{', '  "a": {', '    "b": 1 // last in block', '  } # last', '}'].join('\n')
      );
    });

    it('SHOULD align a comment that is the only content of a block to the block inner depth', () => {
      const formatted = formatRequestData('{\n"a": {\n// only comment\n}\n}');

      expect(formatted).toBe(['{', '  "a": {', '    // only comment', '  }', '}'].join('\n'));
    });

    it('SHOULD align chained standalone comments to the same following line', () => {
      const formatted = formatRequestData('{\n"a": {\n// one\n# two\n"b": 1\n}\n}');

      expect(formatted).toBe(
        ['{', '  "a": {', '    // one', '    # two', '    "b": 1', '  }', '}'].join('\n')
      );
    });

    it('SHOULD NOT treat comment-like strings on their own line as comments', () => {
      const formatted = formatRequestData('{\n// c\n"values": [\n"# not a comment"\n]\n}');

      expect(formatted).toContain('"# not a comment"');
      expect(formatted).toMatch(/\n  \/\/ c\n/);
    });

    it('SHOULD leave multi-line block comments untouched', () => {
      const source = '{\n/*\nmulti\n*/\n"a": 1\n}';
      const formatted = formatRequestData(source);

      expect(formatted).toContain('\n/*\nmulti\n*/\n');
      expect(formatted).toMatch(/\n  "a": 1/);
    });

    it('SHOULD re-indent a standalone single-line block comment', () => {
      const source = '{\n"a": {\n/* note */\n"b": 1\n}\n}';

      expect(formatRequestData(source)).toBe(
        ['{', '  "a": {', '    /* note */', '    "b": 1', '  }', '}'].join('\n')
      );
    });

    it('SHOULD skip multi-line block comments when finding the target indentation', () => {
      const source = '{\n// leading\n       /*\nmulti\n*/\n"a": 1\n}';

      expect(formatRequestData(source)).toBe(
        ['{', '  // leading', '       /*', 'multi', '*/', '  "a": 1', '}'].join('\n')
      );
    });

    it('SHOULD indent an array-only comment relative to its closing bracket', () => {
      const source = '{\n"values": [\n// only comment\n]\n}';

      expect(formatRequestData(source)).toBe(
        ['{', '  "values": [', '    // only comment', '  ]', '}'].join('\n')
      );
    });
  });

  describe('WHEN strings contain comment-like or triple-quote text', () => {
    it('SHOULD format the data without treating the strings as comments', () => {
      const formatted = formatRequestData(
        `{ 'url': 'https://elastic.co/#x', 'pattern': '//literal', 'script': """return 1;""" }`
      );

      expect(formatted).toBe(
        [
          '{',
          '  "url": "https://elastic.co/#x",',
          '  "pattern": "//literal",',
          '  "script": """return 1;"""',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD preserve marker collisions', () => {
      const formatted = formatRequestData(
        `{
// c
"literal": ${TRIPLE_QUOTE_STRINGS_MARKER},
"script": """return 1;"""
}`
      );

      expect(formatted).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
      expect(formatted).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });
  });

  describe('WHEN Hjson cannot preserve semantic content', () => {
    it.each([
      ['a comment between a key and its value', '{\n"a" /* key */ : 1\n}'],
      ['a non-round-trippable number', '{\n// c\n"value":9007199254740993\n}'],
      ['a prototype-related key', '{\n// c\n"__proto__":"sentinel"\n}'],
      ['unparseable commented data', '{\n  "query": // comment\n    {'],
    ])('SHOULD preserve %s exactly', (_description, source) => {
      expect(formatRequestData(source)).toBe(source);
    });
  });
});
