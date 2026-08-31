/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { getAutoIndentedRequests } from './auto_indent';

const getAutoIndentedText = (...args: Parameters<typeof getAutoIndentedRequests>): string =>
  getAutoIndentedRequests(...args).text;

describe('getAutoIndentedRequests', () => {
  const sampleEditorTextLines = [
    '                                    ', // line 1
    'GET    _search                      ', // line 2
    '{                                   ', // line 3
    '  "query":     {                    ', // line 4
    '    "match_all":    {      }        ', // line 5
    '    }                               ', // line 6
    '   }                                ', // line 7
    '                                    ', // line 8
    '// single comment before Request 2  ', // line 9
    '  GET  _all                         ', // line 10
    '                                    ', // line 11
    '/*                                  ', // line 12
    ' multi-line comment before Request 3', // line 13
    '*/                                  ', // line 14
    'POST   /_bulk                       ', // line 15
    '{                                   ', // line 16
    '       "index":{                    ', // line 17
    '          "_index":"books"          ', // line 18
    '     }                              ', // line 19
    ' }                                  ', // line 20
    '{                                   ', // line 21
    '"name":"1984"                       ', // line 22
    '}{"name":"Atomic habits"}           ', // line 23
    '                                    ', // line 24
    'GET    _search  // test comment     ', // line 25
    '{                                   ', // line 26
    '  "query":     {                    ', // line 27
    '    "match_all":    {   } // comment', // line 28
    '    }                               ', // line 29
    '}                                   ', // line 30
    ' // some comment                    ', // line 31
    '                                    ', // line 32
    'POST    _query                     ', // line 33
    '{                                   ', // line 34
    '  "query":     """', // line 35
    '    FROM sample_data', // line 36
    '    | WHERE message LIKE "Connected *"', // line 37
    '    | SORT @timestamp DESC', // line 38
    '  """                                 ', // line 39
    '}                                   ', // line 40
  ];

  const TEST_REQUEST_1 = {
    // Offsets are with respect to the sample editor text
    startLineNumber: 2,
    endLineNumber: 7,
    startOffset: 1,
    endOffset: 36,
  };

  const TEST_REQUEST_2 = {
    // Offsets are with respect to the sample editor text
    startLineNumber: 10,
    endLineNumber: 10,
    startOffset: 1,
    endOffset: 36,
  };

  const TEST_REQUEST_3 = {
    // Offsets are with respect to the sample editor text
    startLineNumber: 15,
    endLineNumber: 23,
    startOffset: 1,
    endOffset: 36,
  };

  const TEST_REQUEST_5 = {
    // Offsets are with respect to the sample editor text
    startLineNumber: 33,
    endLineNumber: 40,
    startOffset: 1,
    endOffset: 36,
  };

  it('correctly auto-indents a single request with data', () => {
    const formattedData = getAutoIndentedText(
      [TEST_REQUEST_1],
      sampleEditorTextLines
        .slice(TEST_REQUEST_1.startLineNumber - 1, TEST_REQUEST_1.endLineNumber)
        .join('\n'),
      sampleEditorTextLines.join('\n')
    );
    const expectedResultLines = [
      'GET _search',
      '{',
      '  "query": {',
      '    "match_all": {}',
      '  }',
      '}',
    ];

    expect(formattedData).toBe(expectedResultLines.join('\n'));
  });

  it('correctly auto-indents a single request with no data', () => {
    const formattedData = getAutoIndentedText(
      [TEST_REQUEST_2],
      sampleEditorTextLines
        .slice(TEST_REQUEST_2.startLineNumber - 1, TEST_REQUEST_2.endLineNumber)
        .join('\n'),
      sampleEditorTextLines.join('\n')
    );
    const expectedResult = 'GET _all';

    expect(formattedData).toBe(expectedResult);
  });

  it('correctly auto-indents a single request with multiple data', () => {
    const formattedData = getAutoIndentedText(
      [TEST_REQUEST_3],
      sampleEditorTextLines
        .slice(TEST_REQUEST_3.startLineNumber - 1, TEST_REQUEST_3.endLineNumber)
        .join('\n'),
      sampleEditorTextLines.join('\n')
    );
    const expectedResultLines = [
      'POST /_bulk',
      '{',
      '  "index": {',
      '    "_index": "books"',
      '  }',
      '}',
      '{',
      '  "name": "1984"',
      '}',
      '{',
      '  "name": "Atomic habits"',
      '}',
    ];

    expect(formattedData).toBe(expectedResultLines.join('\n'));
  });

  it('auto-indents multiple request with comments in between', () => {
    const formattedData = getAutoIndentedText(
      [TEST_REQUEST_1, TEST_REQUEST_2, TEST_REQUEST_3],
      sampleEditorTextLines.slice(1, 23).join('\n'),
      sampleEditorTextLines.join('\n')
    );
    const expectedResultLines = [
      'GET _search',
      '{',
      '  "query": {',
      '    "match_all": {}',
      '  }',
      '}',
      '',
      '// single comment before Request 2',
      'GET _all',
      '',
      '/*',
      'multi-line comment before Request 3',
      '*/',
      'POST /_bulk',
      '{',
      '  "index": {',
      '    "_index": "books"',
      '  }',
      '}',
      '{',
      '  "name": "1984"',
      '}',
      '{',
      '  "name": "Atomic habits"',
      '}',
    ];

    expect(formattedData).toBe(expectedResultLines.join('\n'));
  });

  it('keeps selected lines after a request whose formatted line count changes', () => {
    const unformatted = ['GET _search', '{', '"a":1,"b":2', '}', '   ', '// after'].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 4, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).toBe(
      ['GET _search', '{', '  "a": 1,', '  "b": 2', '}', '', '// after'].join('\n')
    );
  });

  it('auto-indents request body with line comments', () => {
    const unformatted = [
      'GET _search // test comment',
      '{',
      '"query":{"match_all":{}} // comment',
      '"size":10',
      '}',
    ].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 5, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).toBe(
      [
        'GET _search // test comment',
        '{',
        '  "query": {',
        '    "match_all": {}',
        '  }, // comment',
        '  "size": 10',
        '}',
      ].join('\n')
    );
  });

  it('auto-indents request body with hash and block comments', () => {
    const unformatted = ['GET _search', '{', '# hash', '"a":1, /* block */', '"b":2', '}'].join(
      '\n'
    );
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).not.toBe(unformatted);
    expect(formattedData).toContain('# hash');
    expect(formattedData).toContain('/* block */');
    expect(formattedData).toMatch(/\n  "a": 1/);
    expect(formattedData).toMatch(/\n  "b": 2/);
  });

  it('auto-indents empty comments', () => {
    const cases = [
      { lines: ['"a":1,//', '"b":2'], comment: '//' },
      { lines: ['"a":1,#', '"b":2'], comment: '#' },
      { lines: ['"a":1,/**/"b":2'], comment: '/**/' },
    ];

    for (const { lines, comment } of cases) {
      const unformatted = ['GET _search', '{', ...lines, '}'].join('\n');
      const lineCount = unformatted.split('\n').length;
      const formattedData = getAutoIndentedText(
        [
          {
            startLineNumber: 1,
            endLineNumber: lineCount,
            startOffset: 0,
            endOffset: unformatted.length,
          },
        ],
        unformatted,
        unformatted
      );

      expect(formattedData).toContain(comment);
      expect(formattedData).toMatch(/\n  "a": 1/);
      expect(formattedData).toMatch(/\n  "b": 2/);
    }
  });

  it('auto-indents comments adjacent to scalar values', () => {
    const cases = [
      { scalar: '1', comment: '// c', lines: ['"a":1// c', ',"b":2'] },
      { scalar: 'true', comment: '/* c */', lines: ['"a":true/* c */,', '"b":2'] },
      { scalar: 'null', comment: '# c', lines: ['"a":null# c', ',"b":2'] },
    ];

    for (const { scalar, comment, lines } of cases) {
      const unformatted = ['GET _search', '{', ...lines, '}'].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 5, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).not.toBe(unformatted);
      expect(formattedData).toContain(comment);
      expect(formattedData).toMatch(new RegExp(`\\n  "a": ${scalar}`));
      expect(formattedData).toMatch(/\n  "b": 2/);
    }
  });

  it('auto-indents a final comment before a trailing comma', () => {
    const unformatted = ['GET _search', '{', '"a":1/* c */,', '}'].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 4, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).not.toBe(unformatted);
    expect(formattedData).toContain('/* c */');
    expect(formattedData).toMatch(/\n  "a": 1/);
  });

  it('auto-indents multiple and chained comments before commas in one body', () => {
    const unformatted = [
      'GET _search',
      '{',
      '"a":{"x":1// x',
      '/* x block */',
      '# x hash',
      ',"y":2/* y first *//* y second */,',
      '"z":3,"w":4/* w first */ /* w second */ ,"v":5},"b":[1// i',
      ',2// j',
      ',3],"c":[/* c note */"x","y"]',
      '}',
    ].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 10, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).not.toBe(unformatted);
    expect(formattedData).toContain('// x');
    expect(formattedData).toContain('/* x block */');
    expect(formattedData).toContain('# x hash');
    expect(formattedData).toContain('/* y first */');
    expect(formattedData).toContain('/* y second */');
    expect(formattedData).toContain('/* w first */');
    expect(formattedData).toContain('/* w second */');
    expect(formattedData).toContain('/* c note */');
    expect(formattedData).toContain('// i');
    expect(formattedData).toContain('// j');
    expect(formattedData).toMatch(/\n    "x": 1/);
    expect(formattedData).toMatch(/\n    "y": 2/);
    expect(formattedData).toMatch(/\n    "z": 3/);
    expect(formattedData).toMatch(/\n    "w": 4/);
    expect(formattedData).toMatch(/\n    "v": 5/);
    expect(formattedData).toMatch(/\n  "b": \[/);
    expect(formattedData).toMatch(/\n  "c": \[/);
  });

  it('auto-indents chained comments before commas across CRLF lines', () => {
    const unformatted = ['GET _search', '{', '"a":1// one', '/* two */', ',"b":2', '}'].join(
      '\r\n'
    );
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).toContain('// one');
    expect(formattedData).toContain('/* two */');
    expect(formattedData).toMatch(/\n  "a": 1/);
    expect(formattedData).toMatch(/\n  "b": 2/);
  });

  it('auto-indents chained line comments across CRLF lines without reporting a fallback', () => {
    const unformatted = ['GET _search', '{', '"a": 1 // first', '# second', '// third', '}'].join(
      '\r\n'
    );

    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: `GET _search\n${['{', '  "a": 1 // first', '  # second', '  // third', '}'].join(
        '\r\n'
      )}`,
      hasCommentFallback: false,
    });
  });

  it('auto-indents request body with comments and triple-quote strings', () => {
    const cases = [
      {
        unformatted: [
          'POST _query',
          '{',
          '// watch',
          '"script": """',
          '  def a = 1; // painless',
          '  return a;',
          '"""',
          '}',
        ].join('\n'),
        outsideComment: '// watch',
      },
      {
        unformatted: ['POST _query', '{', '# mentions """', '"script": """return 1;"""', '}'].join(
          '\n'
        ),
        outsideComment: '# mentions """',
      },
      {
        unformatted: [
          'POST _query',
          '{',
          '/* mentions """ */',
          '"script": """return 1;"""',
          '}',
        ].join('\n'),
        outsideComment: '/* mentions """ */',
      },
    ];

    for (const { unformatted, outsideComment } of cases) {
      const lineCount = unformatted.split('\n').length;
      const formattedData = getAutoIndentedText(
        [
          {
            startLineNumber: 1,
            endLineNumber: lineCount,
            startOffset: 0,
            endOffset: unformatted.length,
          },
        ],
        unformatted,
        unformatted
      );

      expect(formattedData).not.toBe(unformatted);
      expect(formattedData).toContain(outsideComment);
      expect(formattedData).toMatch(/\n  "script"/);
      expect(formattedData).toContain('"""');
      if (unformatted.includes('// painless')) {
        expect(formattedData).toContain('def a = 1; // painless');
        expect(formattedData).toContain('return a;');
      } else {
        expect(formattedData).toContain('"""return 1;"""');
      }
    }
  });

  it('auto-indents triple-quote strings after comment-like text in quoted values', () => {
    const cases = [
      {
        body: '{"url":"https://elastic.co","script":"""return 1;"""}',
        quotedValue: 'https://elastic.co',
      },
      {
        body: '{"text":"escaped \\" // still a string","script":"""return 1;"""}',
        quotedValue: 'escaped \\" // still a string',
      },
    ];

    for (const { body, quotedValue } of cases) {
      const unformatted = `POST _query\n${body}`;
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 2, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).not.toBe(unformatted);
      expect(formattedData).toContain(quotedValue);
      expect(formattedData).toMatch(/\n  "script": """return 1;"""/);
    }
  });

  it('does not discard comments between a property key, colon, and value', () => {
    const cases = [
      { body: '{\n"a" /* key */ : 1\n}', comment: '/* key */' },
      { body: '{\n"a": /* value */ 1\n}', comment: '/* value */' },
    ];

    for (const { body, comment } of cases) {
      const unformatted = `GET _search\n${body}`;
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 4, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toBe(unformatted);
      expect(formattedData).toContain(comment);
    }
  });

  it('does not change numeric values that Hjson cannot round trip', () => {
    for (const value of ['9007199254740993', '123456789012345678901234567890', '1e400']) {
      const body = `{\n// c\n"value":${value}\n}`;
      const unformatted = `GET _search\n${body}`;
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 5, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toContain(`"value":${value}`);
    }
  });

  it('does not change values assigned to prototype-related keys', () => {
    const unformatted = [
      'GET _search',
      '{',
      '// c',
      '"__proto__":"sentinel",',
      '"constructor":true,',
      '"prototype":null',
      '}',
    ].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 7, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).toContain('"__proto__":"sentinel"');
    expect(formattedData).toContain('"constructor":true');
    expect(formattedData).toContain('"prototype":null');
  });

  it('auto-indents request body when comments contain braces', () => {
    const cases = [
      {
        unformatted: ['GET _search', '{', '// note: }', '"a":1', '} // tail'].join('\n'),
        inner: '// note: }',
        tail: '} // tail',
      },
      {
        unformatted: ['GET _search', '{', '# note: }', '"a":1', '} # tail'].join('\n'),
        inner: '# note: }',
        tail: '} # tail',
      },
      {
        unformatted: ['GET _search', '{', '/* note: } */', '"a":1', '} /* tail */'].join('\n'),
        inner: '/* note: } */',
        tail: '} /* tail */',
      },
    ];

    for (const { unformatted, inner, tail } of cases) {
      const lineCount = unformatted.split('\n').length;
      const formattedData = getAutoIndentedText(
        [
          {
            startLineNumber: 1,
            endLineNumber: lineCount,
            startOffset: 0,
            endOffset: unformatted.length,
          },
        ],
        unformatted,
        unformatted
      );

      expect(formattedData).not.toBe(unformatted);
      expect(formattedData).toMatch(/\n  "a": 1/);
      expect(formattedData.split('').filter((c) => c === '{').length).toBe(1);
      expect(formattedData).toContain(inner);
      expect(formattedData).toContain(tail);
      expect(formattedData.split('\n').some((line) => line === '/' || line === 't')).toBe(false);
    }
  });

  it('auto-indents request body with triple-quote marker literal and comments', () => {
    const unformatted = [
      'POST _query',
      '{',
      '// c',
      '"literal": "{tripleQuoteString}",',
      '"script": """return 1;"""',
      '}',
    ].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).not.toBe(unformatted);
    expect(formattedData).toContain('// c');
    expect(formattedData).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
    expect(formattedData).toMatch(/"script"\s*:\s*"""return 1;"""/);
  });

  describe('WHEN a string decodes to the triple-quote marker', () => {
    it('SHOULD preserve the string and the triple-quote value', () => {
      const unformatted = [
        'POST _query',
        '{',
        '// c',
        '"literal": "\\u007btripleQuoteString}",',
        '"script": """return 1;"""',
        '}',
      ].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
      expect(formattedData).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });
  });

  describe('WHEN comments and strings collide with consecutive triple-quote markers', () => {
    it('SHOULD preserve every collision and the triple-quote value', () => {
      const unformatted = [
        'POST _query',
        '{',
        '// "{tripleQuoteString}"',
        '"literal0": "\\u007btripleQuoteString_0}",',
        '"literal1": "{tripleQuoteString_1}",',
        '"script": """return 1;"""',
        '}',
      ].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 7, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toContain('// "{tripleQuoteString}"');
      expect(formattedData).toMatch(/"literal0"\s*:\s*"\{tripleQuoteString_0\}"/);
      expect(formattedData).toMatch(/"literal1"\s*:\s*"\{tripleQuoteString_1\}"/);
      expect(formattedData).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });
  });

  describe('WHEN a single-quoted string decodes to the triple-quote marker', () => {
    it('SHOULD preserve the string and the triple-quote value', () => {
      const unformatted = [
        'POST _query',
        '{',
        '// c',
        "'literal': '{tripleQuoteString}',",
        '"script": """return 1;"""',
        '}',
      ].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toMatch(/"literal"\s*:\s*"\{tripleQuoteString\}"/);
      expect(formattedData).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });

    it('SHOULD ignore triple-quote delimiters inside the single-quoted string', () => {
      const unformatted = [
        'POST _query',
        '{',
        '// c',
        '\'text\': \'mentions """foo""" here\',',
        '"script": """return 1;"""',
        '}',
      ].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 6, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toContain('mentions \\"\\"\\"foo\\"\\"\\" here');
      expect(formattedData).toMatch(/"script"\s*:\s*"""return 1;"""/);
    });
  });

  describe('WHEN single-quoted Hjson values contain comment-like text', () => {
    it('SHOULD format them as comment-free data', () => {
      const unformatted = [
        'GET _search',
        "{ 'url': 'https://elastic.co/#x', 'pattern': '//literal' }",
      ].join('\n');
      const formattedData = getAutoIndentedText(
        [{ startLineNumber: 1, endLineNumber: 2, startOffset: 0, endOffset: unformatted.length }],
        unformatted,
        unformatted
      );

      expect(formattedData).toBe(
        [
          'GET _search',
          '{',
          '  "url": "https://elastic.co/#x",',
          '  "pattern": "//literal"',
          '}',
        ].join('\n')
      );
    });
  });

  it('reports when an unparseable commented request body is left unchanged', () => {
    const unformatted = ['GET _search', '{', '  "query": // comment', '    {'].join('\n');
    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 4, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({ text: unformatted, hasCommentFallback: true });
  });

  describe('WHEN one selected request falls back', () => {
    it('SHOULD report the fallback after formatting a later request', () => {
      const firstRequest = ['GET _search', '{', '"a": /* keep */ 1', '}'].join('\n');
      const secondRequest = ['GET _count', '{"b":2}'].join('\n');
      const unformatted = [firstRequest, secondRequest].join('\n');
      const result = getAutoIndentedRequests(
        [
          { startLineNumber: 1, endLineNumber: 4, startOffset: 0, endOffset: firstRequest.length },
          {
            startLineNumber: 5,
            endLineNumber: 6,
            startOffset: firstRequest.length + 1,
            endOffset: unformatted.length,
          },
        ],
        unformatted,
        unformatted
      );

      expect(result).toEqual({
        text: [firstRequest, 'GET _count', '{', '  "b": 2', '}'].join('\n'),
        hasCommentFallback: true,
      });
    });

    it('SHOULD report a later fallback after formatting an earlier request', () => {
      const firstRequest = ['GET _count', '{"b":2}'].join('\n');
      const secondRequest = ['GET _search', '{', '"a": /* keep */ 1', '}'].join('\n');
      const unformatted = [firstRequest, secondRequest].join('\n');
      const result = getAutoIndentedRequests(
        [
          { startLineNumber: 1, endLineNumber: 2, startOffset: 0, endOffset: firstRequest.length },
          {
            startLineNumber: 3,
            endLineNumber: 6,
            startOffset: firstRequest.length + 1,
            endOffset: unformatted.length,
          },
        ],
        unformatted,
        unformatted
      );

      expect(result).toEqual({
        text: ['GET _count', '{', '  "b": 2', '}', secondRequest].join('\n'),
        hasCommentFallback: true,
      });
    });
  });

  it('preserves an unclosed block comment after a complete object', () => {
    const unformatted = 'GET _search\n{"a":1} /* todo';
    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 2, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result.hasCommentFallback).toBe(false);
    expect(result.text).toContain('/* todo');
    expect(result.text).toMatch(/\n  "a": 1\n/);
  });

  it('falls back before trimming an unclosed block comment', () => {
    const unformatted = 'GET _search\n  {"a":1} /* todo  ';
    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 2, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({ text: unformatted, hasCommentFallback: true });
  });

  it('formats a safe body after a fallback body', () => {
    const unformatted = ['POST /_bulk', '{', '"a": /* keep */ 1', '}', '{"b":2}'].join('\n');
    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 5, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: ['POST /_bulk', '{', '"a": /* keep */ 1', '}', '{', '  "b": 2', '}'].join('\n'),
      hasCommentFallback: true,
    });
  });

  it('formats a safe body before a fallback body', () => {
    const unformatted = ['POST /_bulk', '{"b":2}', '{', '"a": /* keep */ 1', '}'].join('\n');
    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 5, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: ['POST /_bulk', '{', '  "b": 2', '}', '{', '"a": /* keep */ 1', '}'].join('\n'),
      hasCommentFallback: true,
    });
  });

  it('keeps JSON.stringify shape for comment-free siblings in mixed multi-body requests', () => {
    const unformatted = ['POST /_bulk', '{', '"a":1 // c', '}', '{}', '{', '"b":2', '}'].join('\n');
    const formattedData = getAutoIndentedText(
      [{ startLineNumber: 1, endLineNumber: 8, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(formattedData).toContain('// c');
    expect(formattedData).toMatch(/\n\{\}/);
    expect(formattedData).toMatch(/\n  "b": 2/);
  });

  it('correctly auto-indents a single request that contains triple quotes', () => {
    const formattedData = getAutoIndentedText(
      [TEST_REQUEST_5],
      sampleEditorTextLines
        .slice(TEST_REQUEST_5.startLineNumber - 1, TEST_REQUEST_5.endLineNumber)
        .join('\n'),
      sampleEditorTextLines.join('\n')
    );
    const expectedResultLines = [
      'POST _query',
      '{',
      '  "query": """',
      '    FROM sample_data',
      '    | WHERE message LIKE "Connected *"',
      '    | SORT @timestamp DESC',
      '  """',
      '}',
    ];

    expect(formattedData).toBe(expectedResultLines.join('\n'));
  });

  it('correctly auto-indents a request containing an empty array followed by line and multi-line comments', () => {
    const unformatted = [
      'PUT _ingest/pipeline/test',
      '{',
      '              "processors": [',
      '{',
      '      "append": {',
      '             "field": "",',
      '                 "value": [] //hello',
      '                  /*',
      '        multi-line',
      '',
      '        */',
      '      }',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 15, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: [
        'PUT _ingest/pipeline/test',
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
      ].join('\n'),
      hasCommentFallback: false,
    });
  });

  it('keeps a line comment standalone after an empty array', () => {
    const unformatted = [
      'PUT _ingest/pipeline/test',
      '{',
      '  "processors": [',
      '    {',
      '      "append": {',
      '        "field": "",',
      '        "value": [',
      '        ] ',
      '        // hello',
      '        /*',
      '        multi-line',
      '',
      '               */',
      '      }',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 17, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: [
        'PUT _ingest/pipeline/test',
        '{',
        '  "processors": [',
        '    {',
        '      "append": {',
        '        "field": "",',
        '        "value": []',
        '        // hello',
        '        /*',
        '        multi-line',
        '',
        '               */',
        '      }',
        '    }',
        '  ]',
        '}',
      ].join('\n'),
      hasCommentFallback: false,
    });
  });

  it('keeps a block comment standalone after an empty array', () => {
    const unformatted = [
      'PUT _ingest/pipeline/test',
      '{',
      '  "processors": [',
      '    {',
      '      "append": {',
      '        "field": "",',
      '        "value": [',
      '        ]',
      '        /*',
      '        multi-line',
      '',
      '               */',
      '      }',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 16, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: [
        'PUT _ingest/pipeline/test',
        '{',
        '  "processors": [',
        '    {',
        '      "append": {',
        '        "field": "",',
        '        "value": []',
        '        /*',
        '        multi-line',
        '',
        '               */',
        '      }',
        '    }',
        '  ]',
        '}',
      ].join('\n'),
      hasCommentFallback: false,
    });
  });

  it('correctly auto-indents a request containing an empty array followed by multiple line comments with empty comment lines', () => {
    const unformatted = [
      'PUT _ingest/pipeline/test',
      '{',
      '              "processors": [',
      '{',
      '      "append": {',
      '             "field": "",',
      '                 "value": [] //hello',
      '                  //',
      '        // multi-line',
      '',
      '        //',
      '      }',
      '    }',
      '  ]',
      '}',
    ].join('\n');

    const result = getAutoIndentedRequests(
      [{ startLineNumber: 1, endLineNumber: 16, startOffset: 0, endOffset: unformatted.length }],
      unformatted,
      unformatted
    );

    expect(result).toEqual({
      text: [
        'PUT _ingest/pipeline/test',
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
      ].join('\n'),
      hasCommentFallback: false,
    });
  });
});
