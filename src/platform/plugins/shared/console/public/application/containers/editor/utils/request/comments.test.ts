/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { parse } from 'hjson';
import { containsComments, removeCommentsFromData } from './comments';
import { TRIPLE_QUOTE_STRINGS_MARKER } from './triple_quotes';

describe('request comments', () => {
  describe('WHEN detecting comments', () => {
    it.each([
      [
        'comment markers inside strings',
        '{"url":"https://elastic.co/#x","pattern":"//literal","script":"""// painless"""}',
        false,
      ],
      ['a line comment', '{\n// comment\n"a":1\n}', true],
      ['a block comment', '{/* comment */"a":1}', true],
      ['an unclosed block comment', '{"a":1} /* todo', true],
      ['a hash comment', '{\n# comment\n"a":1\n}', true],
      ['escaped quotes', '{"value":"escaped \\" // still a string"}', false],
      ['a comment after a string', '{"value":"text" // comment\n}', true],
      ['', '', false],
    ])('SHOULD detect %s', (_description, requestData, expected) => {
      expect(containsComments(requestData)).toBe(expected);
    });

    it('SHOULD remain stable across consecutive calls', () => {
      const withComment = '{\n// comment\n"a":1\n}';
      const withoutComment = '{"a":1}';

      expect(containsComments(withComment)).toBe(true);
      expect(containsComments(withoutComment)).toBe(false);
      expect(containsComments(withComment)).toBe(true);
    });
  });

  describe('WHEN removing comments', () => {
    it('SHOULD remove line and block comments from parseable data', () => {
      const requestData = `{
  // line comment
  "query": {
    /* block comment */
    "match_all": {}
  } // trailing comment
}`;
      const result = removeCommentsFromData(requestData);

      expect(containsComments(result)).toBe(false);
      expect(JSON.parse(result)).toEqual({ query: { match_all: {} } });
    });

    it('SHOULD remove an unclosed block comment without coercing a large integer', () => {
      const result = removeCommentsFromData('{"value":9007199254740993} /* todo');

      expect(result).toContain('9007199254740993');
      expect(result).not.toContain('/* todo');
    });

    it('SHOULD remove an unclosed block comment from a non-finite number', () => {
      const result = removeCommentsFromData('{"value":1e400} /* todo');

      expect(result).toContain('1e400');
      expect(result).not.toContain('/* todo');
    });

    it.each(['9007199254740993', '1e400'])(
      'SHOULD preserve %s while removing a closed block comment',
      (numberLiteral) => {
        const result = removeCommentsFromData(`{"value":${numberLiteral}} /* todo */`);

        expect(result).toContain(numberLiteral);
        expect(result).not.toContain('/* todo */');
      }
    );

    it('SHOULD remove an unclosed block comment after a triple-quoted string', () => {
      const result = removeCommentsFromData('{"source":"""return 1;"""} /* todo');

      expect(result).toContain('"""return 1;"""');
      expect(result).not.toContain('/* todo');
    });

    it('SHOULD preserve line breaks while removing comments before an unclosed block comment', () => {
      const result = removeCommentsFromData(
        ['{', '"a":1 // line comment', '"b":2', '} /* block comment'].join('\n')
      );

      expect(result).not.toContain('line comment');
      expect(result).not.toContain('block comment');
      expect(parse(result)).toEqual({ a: 1, b: 2 });
    });

    it('SHOULD remove an unclosed block comment from otherwise invalid data', () => {
      const requestData = '{"a":1 /* todo';

      expect(removeCommentsFromData(requestData)).toBe('{"a":1  ');
    });

    it('SHOULD normalize parseable Hjson after removing a closed comment', () => {
      const result = removeCommentsFromData('{foo:1 /* comment */}');

      expect(JSON.parse(result)).toEqual({ foo: 1 });
    });

    it('SHOULD preserve comments inside triple-quoted strings', () => {
      const requestData = `{
  // watch metadata
  "script": {
    "lang": "painless",
    "source": """
      def a = 1; // painless comment
      return a;
    """
  } /* end of script */
}`;
      const result = removeCommentsFromData(requestData);

      expect(result).not.toContain('// watch metadata');
      expect(result).not.toContain('/* end of script */');
      expect(result).toContain(`"source": """
      def a = 1; // painless comment
      return a;
    """`);
    });

    it('SHOULD preserve literal marker values and triple-quoted values', () => {
      const requestData = `{
  // comment
  "literal": ${TRIPLE_QUOTE_STRINGS_MARKER},
  "script": """return 1;"""
}`;
      const result = removeCommentsFromData(requestData);

      expect(result).not.toContain('// comment');
      expect(result).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
      expect(result).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });

    it('SHOULD preserve comment-like text inside regular strings', () => {
      const requestData = `{
  "url": "https://elastic.co", // comment
  "pattern": "/*"
}`;
      const result = removeCommentsFromData(requestData);

      expect(result).not.toContain('// comment');
      expect(JSON.parse(result)).toEqual({ url: 'https://elastic.co', pattern: '/*' });
    });

    it('SHOULD preserve triple-quoted values when parsing reorders keys', () => {
      const requestData = `{
  // comment
  "z": """first""",
  "1": """second"""
}`;
      const result = removeCommentsFromData(requestData);

      expect(result).toMatch(/"z"\s*:\s*"""first"""/);
      expect(result).toMatch(/"1"\s*:\s*"""second"""/);
    });

    it('SHOULD ignore triple-quote delimiters inside comments', () => {
      const requestData = `{
  // this comment mentions """
  /* this block comment also mentions """ */
  "script": """return 1;"""
}`;
      const result = removeCommentsFromData(requestData);

      expect(result).not.toContain('this comment mentions');
      expect(result).not.toContain('this block comment');
      expect(result).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });

    it('SHOULD leave invalid data unchanged', () => {
      const requestData = '{\n  "query": // comment\n    {';

      expect(removeCommentsFromData(requestData)).toBe(requestData);
    });
  });
});
