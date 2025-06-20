/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import { checkForTripleQuotesAndQueries, unescapeInvalidChars } from './autocomplete_utils';

describe('autocomplete_utils', () => {
  describe('checkForTripleQuotesAndQueries', () => {
    it('should return false for all flags for an empty string', () => {
      expect(checkForTripleQuotesAndQueries('')).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
    });

    it('should return false for all flags for a request without triple quotes', () => {
      const request = `POST _search\n{\n  "query": {\n    "match": {\n      "message": "hello world"\n    }\n  }\n}`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
    });

    it('should return true for insideTripleQuotes and false for insideTripleQuotesQuery when triple quotes are outside a query', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            for (field in params['fields']){\n                if (!$(field, '').isEmpty()){\n`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: true,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
    });

    it('should return false for all flags when triple-quoted string is properly closed', () => {
      const request = `POST _ingest/pipeline/_simulate\n{\n  "pipeline": {\n    "processors": [\n      {\n        "script": {\n          "source":\n          """\n            return 'hello';\n          """\n        }\n      }\n    ]\n  }\n}`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
    });

    it('should return true for both insideTripleQuotes and insideTripleQuotesQuery if inside a "query" field', () => {
      const request = `POST _search\n{\n  "query": """FROM test `;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: true,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: true,
        queryIndex: request.indexOf('"""') + 3,
      });
    });

    it('should return true for insideSingleQuotesQuery if inside a single-quoted "query" string', () => {
      const request = `GET index/_search\n{\n  "query": "SELECT * FROM logs `;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: true,
        insideTripleQuotesQuery: false,
        queryIndex: 32,
      });
    });

    it('should return false for all flags if single quote is closed', () => {
      const request = `GET index/_search\n{\n  "query": "SELECT * FROM logs" }`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
    });

    it('should handle escaped quotes correctly (not toggling inside state)', () => {
      const request = `GET _search\n{\n  "query": "FROM test | WHERE KQL(\\"\\"\\")`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: true,
        insideTripleQuotesQuery: false,
        queryIndex: 26,
      });
    });

    it('should reset the state after closing triple quotes', () => {
      const request = `GET _search\n{\n  "query": """SELECT * FROM logs"""\n}`;
      expect(checkForTripleQuotesAndQueries(request)).toEqual({
        insideTripleQuotes: false,
        insideSingleQuotesQuery: false,
        insideTripleQuotesQuery: false,
        queryIndex: -1,
      });
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
      // \\\\\" becomes \\", \\ becomes \
      expect(unescapeInvalidChars(input)).toBe('\\"test"');
    });
  });
});
