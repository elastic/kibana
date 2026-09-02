/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { formatRequestData } from './formatter';
import { TRIPLE_QUOTE_STRINGS_MARKER } from '../triple_quotes';

const formatRequestDataText = (source: string): string => formatRequestData(source).text;

describe('request formatter', () => {
  describe('WHEN data contains supported comments', () => {
    it('SHOULD retain all comment kinds while formatting', () => {
      const formatted = formatRequestDataText('{\n# hash\n"a":1, /* block */\n"b":2\n}');

      expect(formatted).toContain('# hash');
      expect(formatted).toContain('/* block */');
      expect(formatted).toMatch(/\n  "a": 1/);
      expect(formatted).toMatch(/\n  "b": 2/);
    });

    it('SHOULD move commas before chained comments', () => {
      const formatted = formatRequestDataText('{\n"a":1// one\n/* two */\n,"b":2\n}');

      expect(formatted).toContain('// one');
      expect(formatted).toContain('/* two */');
      expect(formatted).toMatch(/\n  "a": 1/);
      expect(formatted).toMatch(/\n  "b": 2/);
    });
  });

  describe('WHEN standalone comments have stale indentation', () => {
    it('SHOULD re-indent them to the depth of the code they precede', () => {
      const formatted = formatRequestDataText(
        '{\n"query": {\n# match every document\n"match_all": {}\n},\n        // deep note\n"size": 10\n}'
      );

      expect(formatted).toBe(
        [
          '{',
          '  "query": {',
          '    # match every document',
          '    "match_all": {}',
          '  },',
          '  // deep note',
          '  "size": 10',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD preserve comments that end a block as standalone lines', () => {
      const formatted = formatRequestDataText('{\n"a": {\n"b": 1\n// last in block\n}\n# last\n}');

      expect(formatted).toBe(
        ['{', '  "a": {', '    "b": 1', '    // last in block', '  }', '  # last', '}'].join('\n')
      );
    });

    it('SHOULD align a comment that is the only content of a block to the block inner depth', () => {
      const formatted = formatRequestDataText('{\n"a": {\n// only comment\n}\n}');

      expect(formatted).toBe(['{', '  "a": {', '    // only comment', '  }', '}'].join('\n'));
    });

    it('SHOULD align chained standalone comments to the same following line', () => {
      const formatted = formatRequestDataText('{\n"a": {\n// one\n# two\n"b": 1\n}\n}');

      expect(formatted).toBe(
        ['{', '  "a": {', '    // one', '    # two', '    "b": 1', '  }', '}'].join('\n')
      );
    });

    it('SHOULD NOT treat comment-like strings on their own line as comments', () => {
      const formatted = formatRequestDataText('{\n// c\n"values": [\n"# not a comment"\n]\n}');

      expect(formatted).toContain('"# not a comment"');
      expect(formatted).toMatch(/\n  \/\/ c\n/);
    });

    it('SHOULD align a multi-line block comment opener while preserving its continuation lines', () => {
      const source = '{\n/*\nmulti\n*/\n"a": 1\n}';
      const formatted = formatRequestDataText(source);

      expect(formatted).toContain('\n  /*\nmulti\n*/\n');
      expect(formatted).toMatch(/\n  "a": 1/);
    });

    it('SHOULD re-indent a standalone single-line block comment', () => {
      const source = '{\n"a": {\n/* note */\n"b": 1\n}\n}';

      expect(formatRequestDataText(source)).toBe(
        ['{', '  "a": {', '    /* note */', '    "b": 1', '  }', '}'].join('\n')
      );
    });

    it('SHOULD align a multi-line block comment opener without using its continuation lines as targets', () => {
      const source = '{\n// leading\n       /*\nmulti\n*/\n"a": 1\n}';

      expect(formatRequestDataText(source)).toBe(
        ['{', '  // leading', '  /*', 'multi', '*/', '  "a": 1', '}'].join('\n')
      );
    });

    it('SHOULD indent an array-only comment relative to its closing bracket', () => {
      const source = '{\n"values": [\n// only comment\n]\n}';

      expect(formatRequestDataText(source)).toBe(
        ['{', '  "values": [', '    // only comment', '  ]', '}'].join('\n')
      );
    });
  });

  describe('WHEN strings contain comment-like or triple-quote text', () => {
    it('SHOULD format the data without treating the strings as comments', () => {
      const formatted = formatRequestDataText(
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
      const formatted = formatRequestDataText(
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
      expect(formatRequestDataText(source)).toBe(source);
    });

    it('SHOULD preserve an unclosed block comment while formatting the preceding object', () => {
      const source = '{"a":1} /* todo';

      const result = formatRequestData(source);

      expect(result.status).toBe('formatted');
      expect(result.text).toContain('/* todo');
      expect(result.text).toMatch(/\n  "a": 1\n/);
    });

    it('SHOULD fall back when Hjson trims an unclosed block comment', () => {
      const source = '{"a":1} /* todo  ';

      expect(formatRequestData(source)).toEqual({
        text: source,
        status: 'commentFallback',
      });
    });

    it('SHOULD format request data when an empty array is followed by a line comment and a multi-line block comment before closing brace', () => {
      const source = `{\n              "processors": [\n{\n      "append": {\n             "field": "",\n                 "value": [] //hello\n                  /*\n        multi-line\n\n        */\n      }\n    }\n  ]\n}`;

      const result = formatRequestData(source);

      expect(result.status).toBe('formatted');
      expect(result.text).toBe(
        [
          '{',
          '  "processors": [',
          '    {',
          '      "append": {',
          '        "field": "",',
          '        "value": [] //hello',
          '        /*',
          '        multi-line',
          '',
          '        */',
          '      }',
          '    }',
          '  ]',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD format request data when trailing comments are chained across lines in objects and arrays', () => {
      const objectSource = '{\n"a": 1 // c1\n/* c2 */\n}';
      const arraySource = '[\n1 // c1\n// c2\n]';

      expect(formatRequestData(objectSource)).toEqual({
        text: '{\n  "a": 1 // c1\n  /* c2 */\n}',
        status: 'formatted',
      });

      expect(formatRequestData(arraySource)).toEqual({
        text: '[\n  1 // c1\n  // c2\n]',
        status: 'formatted',
      });
    });

    it('SHOULD preserve CRLF Windows line endings while formatting trailing comments', () => {
      const crlfSource =
        '{\r\n  "processors": [\r\n{\r\n  "append": {\r\n    "value": [] //hello\r\n    /*\r\n    multi\r\n    */\r\n  }\r\n}\r\n]\r\n}';

      const result = formatRequestData(crlfSource);

      expect(result).toEqual({
        status: 'formatted',
        text: [
          '{',
          '  "processors": [',
          '    {',
          '      "append": {',
          '        "value": [] //hello',
          '        /*',
          '    multi',
          '    */',
          '      }',
          '    }',
          '  ]',
          '}',
        ].join('\r\n'),
      });
    });

    it('SHOULD format chained line comments with CRLF Windows line endings', () => {
      const source = ['{', '"a": 1 // first', '# second', '// third', '}'].join('\r\n');

      expect(formatRequestData(source)).toEqual({
        status: 'formatted',
        text: ['{', '  "a": 1 // first', '  # second', '  // third', '}'].join('\r\n'),
      });
    });

    it.each(['// hello', '# hello', '/* hello */'])(
      'SHOULD keep a CRLF singleton standalone %s without mixing LF into the document',
      (comment) => {
        const source = ['{', '"value": [', ']', comment, '}'].join('\r\n');

        const result = formatRequestData(source);

        expect(result).toEqual({
          status: 'formatted',
          text: ['{', '  "value": []', `  ${comment}`, '}'].join('\r\n'),
        });
        expect(result.text.replace(/\r\n/g, '').includes('\n')).toBe(false);
      }
    );

    it('SHOULD keep a CRLF trailing end-of-block comment on its own CRLF line', () => {
      const source = ['{', '"a": 1', '// last', '}'].join('\r\n');

      expect(formatRequestData(source)).toEqual({
        status: 'formatted',
        text: ['{', '  "a": 1', '  // last', '}'].join('\r\n'),
      });
    });

    it('SHOULD format CRLF comma-chained comments identically to the LF twin', () => {
      const lines = ['{', '"a":1// one', '/* two */', ',"b":2', '}'];
      const expectedLines = ['{', '  "a": 1, // one', '  /* two */', '  "b": 2', '}'];

      expect(formatRequestData(lines.join('\r\n'))).toEqual({
        status: 'formatted',
        text: expectedLines.join('\r\n'),
      });
      expect(formatRequestData(lines.join('\n'))).toEqual({
        status: 'formatted',
        text: expectedLines.join('\n'),
      });
    });

    it('SHOULD format request data when an empty array is followed by multiple line comments with empty comment lines', () => {
      const source = `{\n              "processors": [\n{\n      "append": {\n             "field": "",\n                 "value": [] //hello\n                  //\n        // multi-line\n\n        //\n      }\n    }\n  ]\n}`;

      const result = formatRequestData(source);

      expect(result.status).toBe('formatted');
      expect(result.text).toBe(
        [
          '{',
          '  "processors": [',
          '    {',
          '      "append": {',
          '        "field": "",',
          '        "value": [] //hello',
          '        //',
          '        // multi-line',
          '',
          '        //',
          '      }',
          '    }',
          '  ]',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD format request data when line comments contain URLs, hashtags, and embedded comment symbols', () => {
      const source = [
        '{',
        '  "a": [] // see https://example.com/api #tag // not-nested /* test */',
        '  /*',
        '  multi',
        '  */',
        '}',
      ].join('\n');

      const result = formatRequestData(source);

      expect(result.status).toBe('formatted');
      expect(result.text).toBe(
        [
          '{',
          '  "a": [] // see https://example.com/api #tag // not-nested /* test */',
          '  /*',
          '  multi',
          '  */',
          '}',
        ].join('\n')
      );
    });

    it('SHOULD keep empty arrays and objects compact when comments live elsewhere', () => {
      expect(formatRequestData('{\n"value": [],\n"a": 1 // c\n}')).toEqual({
        status: 'formatted',
        text: ['{', '  "value": [],', '  "a": 1 // c', '}'].join('\n'),
      });
      expect(formatRequestData('{\n"value": {},\n"a": 1 // c\n}')).toEqual({
        status: 'formatted',
        text: ['{', '  "value": {},', '  "a": 1 // c', '}'].join('\n'),
      });
    });

    it('SHOULD still expand empty containers that contain an end comment', () => {
      expect(formatRequestData('{\n"value": [\n  //todo\n]\n}')).toEqual({
        status: 'formatted',
        text: ['{', '  "value": [', '    //todo', '  ]', '}'].join('\n'),
      });
      expect(formatRequestData('{\n"value": {\n  //todo\n}\n}')).toEqual({
        status: 'formatted',
        text: ['{', '  "value": {', '    //todo', '  }', '}'].join('\n'),
      });
    });
  });
});
