/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkForTripleQuotesAndEsqlQuery, unescapeInvalidChars } from './autocomplete_utils';

describe('autocomplete_utils', () => {
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

  it('detects triple quoted query after POST   _query?foo=bar with extra spaces', () => {
    const request = `POST   _query?foo=bar\n{\n  "query": """FROM metrics `;
    const result = checkForTripleQuotesAndEsqlQuery(request);
    expect(result).toEqual({
      insideTripleQuotes: true,
      insideEsqlQuery: true,
      esqlQueryIndex: request.indexOf('"""') + 3,
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

  describe('unescapeInvalidChars', () => {
    it('should return the original string if there are no escape sequences', () => {
      const input = 'simple string';
      expect(unescapeInvalidChars(input)).toBe('simple string');
    });

    it('should unescape escaped double quotes', () => {
      const input = '\\"hello\\"';
      expect(unescapeInvalidChars(input)).toBe('"hello"');
    });

    it('should unescape escaped backslashes', () => {
      const input = 'path\\\\to\\\\file';
      expect(unescapeInvalidChars(input)).toBe('path\\to\\file');
    });

    it('should unescape both escaped backslashes and quotes', () => {
      const input = 'say: \\"hello\\" and path: C:\\\\Program Files\\\\App';
      expect(unescapeInvalidChars(input)).toBe('say: "hello" and path: C:\\Program Files\\App');
    });

    it('should handle mixed content correctly', () => {
      const input = 'log: \\"User \\\\\\"admin\\\\\\" logged in\\"';
      expect(unescapeInvalidChars(input)).toBe('log: "User \\"admin\\" logged in"');
    });

    it('should leave already unescaped characters alone', () => {
      const input = '"already unescaped" \\ and /';
      expect(unescapeInvalidChars(input)).toBe('"already unescaped" \\ and /');
    });

    it('should not over-unescape multiple backslashes', () => {
      const input = '\\\\\\\\"test\\\\"';
      // \\\\"test\\" becomes \\"test\"
      expect(unescapeInvalidChars(input)).toBe('\\\\"test\\"');
    });
  });
});
