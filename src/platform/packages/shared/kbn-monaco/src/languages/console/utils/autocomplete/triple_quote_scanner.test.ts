/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import {
  checkForTripleQuotesAndEsqlQuery,
  isInsideTripleQuotedJsonValue,
} from './triple_quote_scanner';

describe('triple_quote_scanner', () => {
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
});
