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
  describe('checkForTripleQuotesAndEsqlQuery', () => {
    it('returns false for all flags for an empty string', () => {
      expect(checkForTripleQuotesAndEsqlQuery('')).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('does not detect ES|QL inside non-_query requests', () => {
      const request = `GET index/_search\n{\n  "query": "FROM logs | STATS `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('returns insideTripleQuotes=true but insideEsqlQuery=false when triple quotes are outside the query value', () => {
      const request = `POST _query\n{\n  "script": """FROM test `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
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
      const request = `post _query\n{\n  "query": """FROM test `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: true,
        esqlQueryIndex: request.indexOf('"""') + 3,
      });
    });

    it('handles escaped quotes correctly (not toggling inside state)', () => {
      const request = `POST _query\n{\n  "query": "FROM test | WHERE KQL(\\\"\\\"\\\")`;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: true,
        esqlQueryIndex: request.indexOf('"FROM test ') + 1,
      });
    });

    it('detects query with /_query endpoint', () => {
      const request = `POST /_query\n{\n  "query": "FROM logs | STATS `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: true,
        esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
      });
    });

    it('detects query with /_query/async endpoint', () => {
      const request = `POST /_query/async\n{\n  "query": "FROM logs | STATS `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: true,
        esqlQueryIndex: request.indexOf('"FROM logs ') + 1,
      });
    });

    it('does not treat longer words as request methods (e.g. GETS, POSTER)', () => {
      const methods = ['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH'] as const;
      for (const method of methods) {
        const request = `${method}A _query\n{\n  "query": "FROM logs | STATS `;
        expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
          insideTripleQuotes: false,
          insideEsqlQuery: false,
          esqlQueryIndex: -1,
        });
      }
    });

    it('does not treat near-miss keys as the "query" value', () => {
      const request = `POST _query\n{\n  "queryx": "FROM logs | STATS `;
      expect(checkForTripleQuotesAndEsqlQuery(request)).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
      });
    });

    it('only flags the current active _query section in a mixed multi-request buffer', () => {
      const partial = `POST _query\n{\n  "query": "FROM a | STATS "\n}\nPOST _query\n{\n  "query": """FROM b | WHERE foo = `;
      expect(checkForTripleQuotesAndEsqlQuery(partial)).toEqual({
        insideTripleQuotes: true,
        insideEsqlQuery: true,
        esqlQueryIndex: partial.lastIndexOf('"""') + 3,
      });
    });

    it('handles request method at end of buffer without trailing newline', () => {
      expect(checkForTripleQuotesAndEsqlQuery('POST _query')).toEqual({
        insideTripleQuotes: false,
        insideEsqlQuery: false,
        esqlQueryIndex: -1,
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
      // \\\\"test\\" becomes \\"test\"
      expect(unescapeInvalidChars(input)).toBe('\\\\"test\\"');
    });
  });
});
