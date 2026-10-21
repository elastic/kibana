/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { performance } from 'node:perf_hooks';

import {
  checkForTripleQuotesAndEsqlQuery,
  createInsideConsoleStringChecker,
  endsWithConsoleBodyContinuation,
  getLineRemainderWithoutConsoleComments,
  isInsideConsoleComment,
  isInsideConsoleString,
  isInsideTripleQuotedJsonValue,
} from './triple_quote_scanner';

describe('triple_quote_scanner', () => {
  it('scans long request lines without repeatedly rescanning the comment boundary', () => {
    const request = `GET _search?q=${'a'.repeat(16_000)}`;
    const start = performance.now();

    expect(isInsideConsoleString(request)).toBe(false);
    expect(performance.now() - start).toBeLessThan(500);
  });

  describe('checkForTripleQuotesAndQueries', () => {
    it('returns false for all flags for an empty string', () => {
      expect(checkForTripleQuotesAndEsqlQuery('')).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags for a request without triple quotes or ESQL query', () => {
      const request = `POST _search\n{\n  "query": {\n    "match": {\n      "message": "hello world"\n    }\n  }\n}`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns true for insideTripleQuotes and false for ESQL flags when triple quotes are outside a query', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            for (field in params['fields']){\n                if (!$(field, '').isEmpty()){\n`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns true for insideTripleQuotes but false for ESQL flags inside a non-_query request query field', () => {
      const request = `POST _search\n{\n  "query": """FROM test `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for ESQL flags inside a single-quoted query for non-_query request', () => {
      const request = `GET index/_search\n{\n  "query": "SELECT * FROM logs `;
      const result = checkForTripleQuotesAndEsqlQuery(request);
      expect(result).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags if single quote is closed', () => {
      const request = `POST _query\n{\n  "query": "SELECT * FROM logs" }`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns false for all flags if triple quote is closed', () => {
      const request = `POST _query\n{\n  "query": """SELECT * FROM logs""" }`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('does not treat longer words as request methods (e.g. GETS, POSTER)', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'] as const;
      for (const method of methods) {
        const requestMethod = `${method}A`;
        const request = `${requestMethod} _query\n{\n  "query": "SELECT * FROM logs `;
        expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
          insideTripleQuotes: false,
          insideEsqlQuery: false,
          esqlQueryIndex: -1,
        });
      }
    });
  });

  it('sets insideEsqlQuery for single quoted query after POST _query', () => {
    const request = `POST    _query\n{\n  "query": "FROM test `;
    expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM test ') + 1,
    });
  });

  it('sets insideEsqlQuery for triple quoted query after POST _query (case-insensitive)', () => {
    const request = `post _query\n{\n  "query": """FROM test `; // lowercase POST should also match
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"""') + 3,
    });
  });

  it('does not set ESQL flags for GET _query (ES|QL requests are POST-only)', () => {
    const request = 'GET _query\n{\n  "query": "FROM logs ';
    expect(checkForTripleQuotesAndEsqlQuery(request).insideEsqlQuery).toBe(false);
  });

  it('detects single quoted query after POST _query?pretty suffix', () => {
    const request = `POST _query?pretty\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects query with /_query endpoint', () => {
    const request = `POST /_query\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects query with /_query/async endpoint', () => {
    const request = `POST /_query/async\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects triple quoted query after POST   _query?foo=bar with extra spaces', () => {
    const request = `POST   _query?foo=bar\n{\n  "query": """FROM metrics `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"""') + 3,
    });
  });

  it('detects query when request line is indented', () => {
    const request = `  \tPOST _query\n{\n  "query": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('detects query value with whitespace around the colon', () => {
    const request = `POST _query\n{\n  "query"  :\t "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
    });
  });

  it('does not treat near-miss keys as the "query" value', () => {
    const request = `POST _query\n{\n  "queryx": "FROM logs | STATS `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1,
    });
  });

  it('does not set ESQL flags for subsequent non-_query request in same buffer', () => {
    const request = `POST _query\n{\n  "query": "FROM a | STATS "\n}\nGET other_index/_search\n{\n  "query": "match_all" }`;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1, // single quotes closed in second request
    });
  });

  it('only flags current active _query section in mixed multi-request buffer', () => {
    const partial = `POST _query\n{\n  "query": "FROM a | STATS "\n}\nPOST _query\n{\n  "query": """FROM b | WHERE foo = `; // cursor inside triple quotes of second request
    const result = checkForTripleQuotesAndEsqlQuery(partial);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: partial.lastIndexOf('"""') + 3,
    });
  });

  it('handles request method at end of buffer without trailing newline (regression test)', () => {
    const buffer = 'POST _query';
    const result = checkForTripleQuotesAndEsqlQuery(buffer);
    expect(result).toEqual({
      insideTripleQuotes: false,
      insideEsqlQuery: false,
      esqlQueryIndex: -1,
    });
  });

  it('closes a double-quoted string after an even number of backslashes', () => {
    const request = [
      'GET _search',
      '{"path":"\\\\"}',
      'POST _query',
      '{',
      '  "script": """',
      '',
    ].join('\n');
    expect(checkForTripleQuotesAndEsqlQuery(request).insideTripleQuotes).toBe(true);
  });

  it('keeps a double-quoted string open after an escaped quote', () => {
    const request = String.raw`POST _query
{
  "query": "FROM logs | WHERE field == \"value`;
    expect(checkForTripleQuotesAndEsqlQuery(request).insideEsqlQuery).toBe(true);
  });

  it.each(['# """ GET _search', '// """ GET _search', '/* """\nGET _search\n*/'])(
    'ignores quote and request-like text inside Console comments: %s',
    (comment) => {
      const request = ['GET _search', '{}', comment, 'GET _search', ''].join('\n');
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    }
  );

  it.each([
    { content: '# docs', expected: true },
    { content: '// docs', expected: true },
    { content: '/* docs', expected: true },
    { content: '/* docs */', expected: false },
    { content: '{"pattern": "*/", "nested": {', expected: false },
    { content: '"""# not a comment"""', expected: false },
  ])(
    'detects whether the end of Console input is inside a comment: $content',
    ({ content, expected }) => {
      expect(isInsideConsoleComment(content)).toBe(expected);
    }
  );

  it.each([
    { content: '"open', expected: true },
    { content: '"closed"', expected: false },
    { content: '"""open', expected: true },
    { content: '"""def quote = \'"\';""", "nested": {', expected: false },
    { content: 'GET _search?q="foo{', expected: true },
  ])(
    'detects whether the end of Console input is inside a string: $content',
    ({ content, expected }) => {
      expect(isInsideConsoleString(content)).toBe(expected);
    }
  );

  it.each([
    {
      contentBeforePosition: 'GET _search\n{"field": "',
      lineContentAfterPosition: '"}',
      expected: '"}',
    },
    {
      contentBeforePosition: 'GET _search\n{"field": "',
      lineContentAfterPosition: '"} // note',
      expected: '"} ',
    },
    {
      contentBeforePosition: 'GET _search\n{"field": "',
      lineContentAfterPosition: '" /* note */ }',
      expected: '"  }',
    },
    {
      contentBeforePosition: 'GET _search\n{"field": "',
      lineContentAfterPosition: 'http://host/*path#x"}',
      expected: 'http://host/*path#x"}',
    },
    {
      contentBeforePosition: 'GET _search\n{"field": 1, /* note',
      lineContentAfterPosition: ' */ "next": 2}',
      expected: ' "next": 2}',
    },
    {
      contentBeforePosition: 'GET _search\n{"script": """',
      lineContentAfterPosition: '// not comment""", "next": 1}',
      expected: '// not comment""", "next": 1}',
    },
  ])(
    'removes only Console comments from the line remainder: $lineContentAfterPosition',
    ({ contentBeforePosition, lineContentAfterPosition, expected }) => {
      expect(
        getLineRemainderWithoutConsoleComments(contentBeforePosition, lineContentAfterPosition)
      ).toBe(expected);
    }
  );

  it('detects an inline comment at the end of a request line', () => {
    expect(isInsideConsoleComment('GET _search // docs {')).toBe(true);
    expect(isInsideConsoleComment('GET _search # docs {')).toBe(true);
  });

  it('detects a whitespace-separated block comment at the end of a request line', () => {
    expect(isInsideConsoleComment('GET _search /* docs {')).toBe(true);
    expect(isInsideConsoleComment('GET _search /* docs */ ')).toBe(false);
  });

  it('preserves an unterminated trailing block comment across request lines', () => {
    const openComment = 'GET _search /* docs\n{';
    expect(isInsideConsoleComment(openComment)).toBe(true);
    expect(endsWithConsoleBodyContinuation(openComment)).toBe(false);

    const openCommentAfterQuotedUrl = 'GET _search?q="foo bar" /* docs\n{';
    expect(isInsideConsoleComment(openCommentAfterQuotedUrl)).toBe(true);
    expect(endsWithConsoleBodyContinuation(openCommentAfterQuotedUrl)).toBe(false);

    const closedComment = 'GET _search /* docs\n*/\n{';
    expect(isInsideConsoleComment(closedComment)).toBe(false);
    expect(endsWithConsoleBodyContinuation(closedComment)).toBe(true);
  });

  it.each([
    'GET _search // docs /* not block\n{',
    'GET _search # docs /* not block\n{',
    'GET _search?q="foo /* bar"\n{',
  ])('does not carry block-like request-line text into the next line: %s', (content) => {
    expect(isInsideConsoleComment(content)).toBe(false);
    expect(endsWithConsoleBodyContinuation(content)).toBe(true);
  });

  it('preserves ES|QL body state after block-like text in a quoted URL', () => {
    const content = 'POST _query?q="foo /* bar"\n{"query": """FROM logs';
    const analysis = checkForTripleQuotesAndEsqlQuery(content);
    expect(analysis.insideTripleQuotes).toBe(true);
    expect(analysis.insideEsqlQuery).toBe(true);
  });

  // The URL token itself may start with a comment-like marker; only a marker
  // after both the method and the URL is a trailing comment.
  it.each(['DELETE /*', 'GET /*', 'GET /*/_search?pretty', 'GET //_search'])(
    'treats a comment-like marker in the URL position as a URL: %s',
    (content) => {
      expect(isInsideConsoleComment(content)).toBe(false);
    }
  );

  it.each([
    'GET _search?q=http://example.com/path&size=',
    'GET _search?q=tag#1&size=',
    'GET _search?q=value/*pattern&size=',
  ])('preserves comment-like text inside a request URL: %s', (content) => {
    expect(isInsideConsoleComment(content)).toBe(false);
  });

  it.each([
    'GET _search\n{',
    'GET _search\n  "fields": [',
    'GET _search\n    "field", // note',
    'GET _search\n    "field", /* note */',
    'GET _search\n    "field", /* note\n      more */',
    'GET _search\n{"script": """code""", "fields": [',
  ])('detects a body continuation before whitespace or a trailing comment: %s', (content) => {
    expect(endsWithConsoleBodyContinuation(content)).toBe(true);
  });

  it.each([
    'GET _search\n{\n  # next item,',
    'GET _search\n{\n  // next item,',
    'GET _search\n{\n  /* next item, */',
    'GET _search\n["field"',
    'GET _search\n["value,',
    'GET index-a, // request docs',
    '/* docs */ GET index-a,',
    '/* docs\n*/ GET index-a,',
    'GET _search\n{\n  "field"',
  ])('rejects a non-code or non-continuation ending: %s', (content) => {
    expect(endsWithConsoleBodyContinuation(content)).toBe(false);
  });

  it('uses request-line comment rules after a leading block-comment prefix', () => {
    expect(isInsideConsoleComment('/* c */ GET _search?q=http://example.com&size=')).toBe(false);
    expect(isInsideConsoleComment('/* c */ GET _search // docs')).toBe(true);
  });

  it('uses request-line comment rules after closing a multiline block comment', () => {
    expect(isInsideConsoleComment('/* c\n*/ GET _search?q=http://example.com&size=')).toBe(false);
    expect(isInsideConsoleComment('/* c\n*/ GET _search // docs')).toBe(true);
  });

  it.each([
    '/* c */ GET _search?q="foo\n{',
    '/* c\n*/ GET _search?q="foo\n{',
    '/* c */ GET _search?q=value/*pattern\n{',
    '/* c\n*/ GET _search?q=value/*pattern\n{',
    'GET _search\n{} /* c\n*/ GET _search?q="foo\n{',
    'GET _search\n{} /* c\n*/ GET _search?q=value/*pattern\n{',
  ])('preserves request-line state after a closed block-comment prefix: %s', (content) => {
    expect(isInsideConsoleComment(content)).toBe(false);
    expect(isInsideConsoleString(content)).toBe(false);
    expect(endsWithConsoleBodyContinuation(content)).toBe(true);
  });

  it('does not treat a comment-prefixed request-like line inside triple quotes as a request', () => {
    const content = 'POST _query\n{"script": """\n/* c */ GET _search?q=http://example.com';
    expect(isInsideConsoleString(content)).toBe(true);
    expect(isInsideConsoleComment(content)).toBe(false);
  });

  it.each(['# """', '// """', '/* """ */'])(
    'does not treat comment markers inside triple-quoted content as comments: %s',
    (content) => {
      const request = ['POST _query', '{', `  "script": """value ${content}`, '}', ''].join('\n');
      expect(checkForTripleQuotesAndEsqlQuery(request).insideTripleQuotes).toBe(false);
    }
  );

  it.each([
    'POST _query\n{\n  "script": """',
    'POST _query\n{\n  "script":\n  # comment\n  """',
    'POST _query\n{\n  "script": /* comment */ """',
    'POST _query\n["""',
    'POST _query\n[// comment\n"""',
    'POST _query\n["value", """',
  ])('recognizes an open triple quote in a JSON value: %s', (request) => {
    expect(isInsideTripleQuotedJsonValue(request)).toBe(true);
  });

  it.each([
    'GET /foo\n"""',
    'GET /foo\n{\n"""',
    'GET /foo\n{"field":\nGET _search\n"""',
    'GET /foo\n[\nGET _search\n, """',
    'GET /foo\n{"field":"[", """',
    'GET /foo\n[]\n, """',
    'GET /foo\n{"field":"value" """',
    'GET /foo\n["""value""" """',
  ])('rejects an open triple quote outside a JSON value: %s', (request) => {
    expect(isInsideTripleQuotedJsonValue(request)).toBe(false);
  });

  it('does not retain container state for oversized fallback input', () => {
    const request = `POST _search\n${'['.repeat(100_001)}"""`;
    expect(isInsideTripleQuotedJsonValue(request)).toBe(false);
  });

  describe('createInsideConsoleStringChecker', () => {
    const lineStartOffsets = (text: string): number[] => {
      const offsets = [0];
      for (const line of text.split('\n').slice(0, -1)) {
        offsets.push(offsets[offsets.length - 1] + line.length + 1);
      }
      return offsets;
    };

    it('reports line starts inside an unterminated triple-quoted value', () => {
      const text = 'POST _query\n{\n  "script": """\n  GET _all\n  {\n  }';
      const isInsideString = createInsideConsoleStringChecker(text);
      const offsets = lineStartOffsets(text);

      expect(isInsideString(offsets[1])).toBe(false); // {
      expect(isInsideString(offsets[3])).toBe(true); // GET _all
      expect(isInsideString(offsets[5])).toBe(true); // }
      expect(isInsideString(text.length)).toBe(true);
    });

    it('reports offsets outside once a triple-quoted value closes', () => {
      const text = 'POST _query\n{\n  "script": """done"""\n}\nGET _search';
      const isInsideString = createInsideConsoleStringChecker(text);
      const offsets = lineStartOffsets(text);

      expect(isInsideString(offsets[3])).toBe(false); // }
      expect(isInsideString(offsets[4])).toBe(false); // GET _search
    });

    it('reports offsets inside a standard string value spanning the query point', () => {
      const text = 'GET _search\n{"field": "unclosed\nPOST _search';
      const isInsideString = createInsideConsoleStringChecker(text);
      const offsets = lineStartOffsets(text);

      expect(isInsideString(offsets[2])).toBe(true); // POST _search
    });

    it('ignores quotes inside comments', () => {
      const text = 'GET _search\n{\n# "\nPOST _search';
      const isInsideString = createInsideConsoleStringChecker(text);
      const offsets = lineStartOffsets(text);

      expect(isInsideString(offsets[3])).toBe(false); // POST _search
    });

    it('does not treat a quote in a request-line url as opening a string', () => {
      const text = 'GET /a"b\nPOST /c';
      const isInsideString = createInsideConsoleStringChecker(text);
      const offsets = lineStartOffsets(text);

      expect(isInsideString(offsets[1])).toBe(false); // POST /c
    });

    it('treats the opening quote offset as outside its string', () => {
      const text = 'GET _search\n{"a": "v"}';
      const isInsideString = createInsideConsoleStringChecker(text);
      const openingQuoteOffset = text.indexOf('"a');

      expect(isInsideString(openingQuoteOffset)).toBe(false);
      expect(isInsideString(openingQuoteOffset + 1)).toBe(true);
    });

    it('treats the closing delimiter offsets as inside the string', () => {
      const text = 'GET _search\n{"a": """v"""}';
      const isInsideString = createInsideConsoleStringChecker(text);
      const closingQuoteOffset = text.lastIndexOf('"""');

      expect(isInsideString(closingQuoteOffset)).toBe(true);
      expect(isInsideString(closingQuoteOffset + 2)).toBe(true);
      expect(isInsideString(closingQuoteOffset + 3)).toBe(false);
    });
  });
});
